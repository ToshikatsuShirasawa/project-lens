-- =============================================================================
-- AI タスク候補イベント分析クエリ集（PostgreSQL / Supabase SQL Editor 向け）
--
-- 対象: Prisma モデル AiTaskCandidateEvent → テーブル ai_task_candidate_events
-- マイグレーション: prisma/migrations/20260424180000_add_ai_task_candidate_events
--
-- 使い方:
--   - 本ファイルは複数の独立した SELECT から構成されています。
--   - エディタでは「目的のブロックだけ」を選択して実行してください。
--   - スキーマを public 以外にしている場合は、テーブル名を public."ai_task_candidate_events"
--     のように修飾してください。
--
-- eventType 列の型: 列挙型 "AiTaskCandidateEventType"
--   SHOWN | ACCEPTED | SNOOZED | DISMISSED
--
-- 10〜18: "metadataJson" の score / scoreBreakdown 等を使い、スコアと採用率のズレを見る
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. 全体イベント件数
-- ログが期待どおり蓄積されているか、イベント種別の偏り（SHOWN だけ多い等）を確認する
-- -----------------------------------------------------------------------------
SELECT
  "eventType",
  COUNT(*)::bigint AS cnt
FROM "ai_task_candidate_events"
GROUP BY "eventType"
ORDER BY cnt DESC;


-- -----------------------------------------------------------------------------
-- 2. 採用率（全体）
-- SHOWN はインプレッションのため母数から除外し、意思決定イベントのみで率を出す
--   accept_rate = ACCEPTED / (ACCEPTED + SNOOZED + DISMISSED)
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType"
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
)
SELECT
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events;


-- -----------------------------------------------------------------------------
-- 3. ソース別採用率（candidateSource）
-- どの取り込み経路の候補が採用されやすいかを比較する（SHOWN は母数から除外）
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "candidateSource",
    "eventType"
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
)
SELECT
  "candidateSource",
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY "candidateSource"
ORDER BY total DESC, "candidateSource";


-- -----------------------------------------------------------------------------
-- 4. confidenceLevel 別採用率
-- モデルが付けた信頼度ラベルと実際の採用の対応を見る（SHOWN は母数から除外）
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "confidenceLevel",
    "eventType"
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
)
SELECT
  "confidenceLevel",
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY "confidenceLevel"
ORDER BY total DESC, "confidenceLevel";


-- -----------------------------------------------------------------------------
-- 5. structuredReasons 別採用率
-- structuredReasonsJson は API 上 string[]（JSON 配列）として格納される想定。
-- 配列でない・null の場合は空配列として扱い、クエリが落ちないようにする。
-- 1 イベントに複数 reason がある場合、各 reason 行にそのイベントが重複カウントされる。
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    "structuredReasonsJson"
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
),
expanded AS (
  SELECT
    d."eventType",
    r.reason
  FROM decision_events d
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
      WHEN d."structuredReasonsJson" IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(d."structuredReasonsJson"::jsonb) = 'array'
        THEN d."structuredReasonsJson"::jsonb
      ELSE '[]'::jsonb
    END
  ) AS r(reason)
)
SELECT
  reason,
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM expanded
WHERE reason IS NOT NULL
  AND reason <> ''
GROUP BY reason
ORDER BY total DESC, reason;


-- -----------------------------------------------------------------------------
-- 6. 候補ごとの最終結果
-- projectId + candidateId を単位に、各イベント種別の初回時刻と優先ルールによる finalStatus を出す
-- finalStatus 優先順位: ACCEPTED > DISMISSED > SNOOZED > SHOWN_ONLY
-- （同一候補に複数の決定ログがある場合は、優先度の高い状態を最終とみなす）
-- -----------------------------------------------------------------------------
WITH per_candidate AS (
  SELECT
    "projectId",
    "candidateId",
    MAX("candidateTitle") AS "candidateTitle",
    MAX("candidateSource") AS "candidateSource",
    MAX("confidenceLevel") AS "confidenceLevel",
    MIN("createdAt") FILTER (WHERE "eventType" = 'SHOWN') AS "shownAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'ACCEPTED') AS "acceptedAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'SNOOZED') AS "snoozedAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'DISMISSED') AS "dismissedAt",
    CASE
      WHEN BOOL_OR("eventType" = 'ACCEPTED') THEN 'ACCEPTED'
      WHEN BOOL_OR("eventType" = 'DISMISSED') THEN 'DISMISSED'
      WHEN BOOL_OR("eventType" = 'SNOOZED') THEN 'SNOOZED'
      ELSE 'SHOWN_ONLY'
    END AS "finalStatus"
  FROM "ai_task_candidate_events"
  GROUP BY "projectId", "candidateId"
)
SELECT
  "projectId",
  "candidateId",
  "candidateTitle",
  "candidateSource",
  "confidenceLevel",
  "shownAt",
  "acceptedAt",
  "snoozedAt",
  "dismissedAt",
  "finalStatus"
FROM per_candidate
ORDER BY COALESCE("shownAt", "acceptedAt", "snoozedAt", "dismissedAt") DESC NULLS LAST;


-- -----------------------------------------------------------------------------
-- 7. 改善対象: confidence high かつ却下（DISMISSED）があり、採用（ACCEPTED）がない候補
-- DISMISSED 行の confidenceLevel が 'high' のものを「高信頼で却下」と定義する
-- （6 と同様に projectId + candidateId で識別）
-- -----------------------------------------------------------------------------
WITH per_candidate AS (
  SELECT
    "projectId",
    "candidateId",
    MAX("candidateTitle") AS "candidateTitle",
    MAX("candidateSource") AS "candidateSource",
    MIN("createdAt") FILTER (WHERE "eventType" = 'SHOWN') AS "shownAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'ACCEPTED') AS "acceptedAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'SNOOZED') AS "snoozedAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'DISMISSED') AS "dismissedAt",
    CASE
      WHEN BOOL_OR("eventType" = 'ACCEPTED') THEN 'ACCEPTED'
      WHEN BOOL_OR("eventType" = 'DISMISSED') THEN 'DISMISSED'
      WHEN BOOL_OR("eventType" = 'SNOOZED') THEN 'SNOOZED'
      ELSE 'SHOWN_ONLY'
    END AS "finalStatus"
  FROM "ai_task_candidate_events"
  GROUP BY "projectId", "candidateId"
),
high_dismissed_no_accept AS (
  SELECT DISTINCT
    e."projectId",
    e."candidateId"
  FROM "ai_task_candidate_events" e
  WHERE e."eventType" = 'DISMISSED'
    AND e."confidenceLevel" = 'high'
    AND NOT EXISTS (
      SELECT 1
      FROM "ai_task_candidate_events" a
      WHERE a."projectId" = e."projectId"
        AND a."candidateId" = e."candidateId"
        AND a."eventType" = 'ACCEPTED'
    )
)
SELECT
  pc."projectId",
  pc."candidateId",
  pc."candidateTitle",
  pc."candidateSource",
  pc."shownAt",
  pc."acceptedAt",
  pc."snoozedAt",
  pc."dismissedAt",
  pc."finalStatus"
FROM per_candidate pc
INNER JOIN high_dismissed_no_accept h
  ON h."projectId" = pc."projectId"
  AND h."candidateId" = pc."candidateId"
ORDER BY pc."dismissedAt" DESC NULLS LAST;


-- -----------------------------------------------------------------------------
-- 8. 改善対象: confidence が medium または review のイベントで採用（ACCEPTED）された候補
-- 「採用された行」の confidence が medium/review であることを条件とする
-- -----------------------------------------------------------------------------
WITH per_candidate AS (
  SELECT
    "projectId",
    "candidateId",
    MAX("candidateTitle") AS "candidateTitle",
    MAX("candidateSource") AS "candidateSource",
    MIN("createdAt") FILTER (WHERE "eventType" = 'SHOWN') AS "shownAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'ACCEPTED') AS "acceptedAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'SNOOZED') AS "snoozedAt",
    MIN("createdAt") FILTER (WHERE "eventType" = 'DISMISSED') AS "dismissedAt",
    CASE
      WHEN BOOL_OR("eventType" = 'ACCEPTED') THEN 'ACCEPTED'
      WHEN BOOL_OR("eventType" = 'DISMISSED') THEN 'DISMISSED'
      WHEN BOOL_OR("eventType" = 'SNOOZED') THEN 'SNOOZED'
      ELSE 'SHOWN_ONLY'
    END AS "finalStatus"
  FROM "ai_task_candidate_events"
  GROUP BY "projectId", "candidateId"
),
accepted_medium_review AS (
  SELECT DISTINCT
    e."projectId",
    e."candidateId"
  FROM "ai_task_candidate_events" e
  WHERE e."eventType" = 'ACCEPTED'
    AND e."confidenceLevel" IN ('medium', 'review')
)
SELECT
  pc."projectId",
  pc."candidateId",
  pc."candidateTitle",
  pc."candidateSource",
  pc."shownAt",
  pc."acceptedAt",
  pc."snoozedAt",
  pc."dismissedAt",
  pc."finalStatus"
FROM per_candidate pc
INNER JOIN accepted_medium_review m
  ON m."projectId" = pc."projectId"
  AND m."candidateId" = pc."candidateId"
ORDER BY pc."acceptedAt" DESC NULLS LAST;


-- -----------------------------------------------------------------------------
-- 9. 最近のログ一覧（直近 50 件）
-- 生データの確認・デバッグ・時系列のざっくり監査に使う
-- -----------------------------------------------------------------------------
SELECT
  "id",
  "createdAt",
  "projectId",
  "candidateId",
  "eventType",
  "candidateTitle",
  "candidateSource",
  "confidenceLevel",
  "recommendationReason",
  "structuredReasonsJson",
  "createdTaskId",
  "userId",
  "organizationId",
  "metadataJson"
FROM "ai_task_candidate_events"
ORDER BY "createdAt" DESC
LIMIT 50;


-- =============================================================================
-- 10〜18. score（スコア）と採用行動の対応（metadataJson ベース）
--
-- 前提:
--   - クライアントが "metadataJson" に score / scoreBreakdown 等を格納している。
--   - 古いログで score が無い行は、数値変換できないため各クエリで除外する。
--   - 採用率の母数は従来どおり 2〜4 と同様、意思決定イベントのみ
--     (ACCEPTED + SNOOZED + DISMISSED)。SHOWN は含めない。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 10. score別の採用率
-- score（スコア）が高いほど採用されているかを確認する
-- "metadataJson"->>'score' が null・空・非整数のログは除外する
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    ("metadataJson"->>'score')::int AS score
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
    AND "metadataJson" IS NOT NULL
    AND "metadataJson"->>'score' IS NOT NULL
    AND trim("metadataJson"->>'score') <> ''
    AND trim("metadataJson"->>'score') ~ '^-?[0-9]+$'
)
SELECT
  score,
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY score
ORDER BY score DESC;


-- -----------------------------------------------------------------------------
-- 11. score帯別の採用率
-- 細かい score ではなく帯で集約し、傾向をざっくり把握する
--   high_score: score >= 8
--   mid_score:  score >= 4 AND score < 8
--   low_score:  score < 4
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    ("metadataJson"->>'score')::int AS score
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
    AND "metadataJson" IS NOT NULL
    AND "metadataJson"->>'score' IS NOT NULL
    AND trim("metadataJson"->>'score') <> ''
    AND trim("metadataJson"->>'score') ~ '^-?[0-9]+$'
),
banded AS (
  SELECT
    "eventType",
    CASE
      WHEN score >= 8 THEN 'high_score'
      WHEN score >= 4 THEN 'mid_score'
      ELSE 'low_score'
    END AS score_band
  FROM decision_events
)
SELECT
  score_band,
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM banded
GROUP BY score_band
ORDER BY
  CASE score_band
    WHEN 'high_score' THEN 1
    WHEN 'mid_score' THEN 2
    WHEN 'low_score' THEN 3
    ELSE 4
  END;


-- -----------------------------------------------------------------------------
-- 12. 高スコアなのに却下された候補
-- スコア過大評価の疑いがある行を個別に洗い出す（生の DISMISSED イベント）
-- 条件: "eventType" = 'DISMISSED' かつ score >= 6
-- -----------------------------------------------------------------------------
SELECT
  e."projectId",
  e."candidateId",
  e."candidateTitle",
  e."candidateSource",
  e."confidenceLevel",
  ("metadataJson"->>'score')::int AS score,
  e."metadataJson"->'scoreBreakdown' AS "scoreBreakdown",
  e."structuredReasonsJson",
  e."recommendationReason",
  e."createdAt"
FROM "ai_task_candidate_events" e
WHERE e."eventType" = 'DISMISSED'
  AND e."metadataJson" IS NOT NULL
  AND e."metadataJson"->>'score' IS NOT NULL
  AND trim(e."metadataJson"->>'score') <> ''
  AND trim(e."metadataJson"->>'score') ~ '^-?[0-9]+$'
  AND (e."metadataJson"->>'score')::int >= 6
ORDER BY e."createdAt" DESC NULLS LAST;


-- -----------------------------------------------------------------------------
-- 13. 低〜中スコアなのに採用された候補
-- スコア過小評価の疑いがある行を個別に洗い出す（生の ACCEPTED イベント）
-- 条件: "eventType" = 'ACCEPTED' かつ score < 6
-- -----------------------------------------------------------------------------
SELECT
  e."projectId",
  e."candidateId",
  e."candidateTitle",
  e."candidateSource",
  e."confidenceLevel",
  ("metadataJson"->>'score')::int AS score,
  e."metadataJson"->'scoreBreakdown' AS "scoreBreakdown",
  e."structuredReasonsJson",
  e."recommendationReason",
  e."createdAt"
FROM "ai_task_candidate_events" e
WHERE e."eventType" = 'ACCEPTED'
  AND e."metadataJson" IS NOT NULL
  AND e."metadataJson"->>'score' IS NOT NULL
  AND trim(e."metadataJson"->>'score') <> ''
  AND trim(e."metadataJson"->>'score') ~ '^-?[0-9]+$'
  AND (e."metadataJson"->>'score')::int < 6
ORDER BY e."createdAt" DESC NULLS LAST;


-- -----------------------------------------------------------------------------
-- 14. actionability（今すぐタスク化しやすい度合い）別の採用率
-- actionability が高いほど採用されやすいかを確認する
-- 取得元: "metadataJson"->'scoreBreakdown'->>'actionability'
-- actionability が null・空・非整数のログは除外する
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    ("metadataJson"->'scoreBreakdown'->>'actionability')::int AS actionability
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
    AND "metadataJson" IS NOT NULL
    AND "metadataJson"->'scoreBreakdown'->>'actionability' IS NOT NULL
    AND trim("metadataJson"->'scoreBreakdown'->>'actionability') <> ''
    AND trim("metadataJson"->'scoreBreakdown'->>'actionability') ~ '^-?[0-9]+$'
)
SELECT
  actionability,
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY actionability
ORDER BY actionability DESC;


-- -----------------------------------------------------------------------------
-- 15. urgency（急ぎ度）別の採用率
-- urgency が高いほど採用されやすいかを確認する
-- 取得元: "metadataJson"->'scoreBreakdown'->>'urgency'
-- urgency が null・空・非整数のログは除外する
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    ("metadataJson"->'scoreBreakdown'->>'urgency')::int AS urgency
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
    AND "metadataJson" IS NOT NULL
    AND "metadataJson"->'scoreBreakdown'->>'urgency' IS NOT NULL
    AND trim("metadataJson"->'scoreBreakdown'->>'urgency') <> ''
    AND trim("metadataJson"->'scoreBreakdown'->>'urgency') ~ '^-?[0-9]+$'
)
SELECT
  urgency,
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY urgency
ORDER BY urgency DESC;


-- -----------------------------------------------------------------------------
-- 16. sourceKey（候補の出どころ分類キー）別の採用率
-- 表示名 candidateSource ではなく metadata 内の sourceKey で集計する
-- 取得元: "metadataJson"->'scoreBreakdown'->>'sourceKey'
-- sourceKey が null・空のログは除外する
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    "metadataJson"->'scoreBreakdown'->>'sourceKey' AS source_key
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
    AND "metadataJson" IS NOT NULL
    AND "metadataJson"->'scoreBreakdown'->>'sourceKey' IS NOT NULL
    AND trim("metadataJson"->'scoreBreakdown'->>'sourceKey') <> ''
)
SELECT
  source_key AS "sourceKey",
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY source_key
ORDER BY total DESC, source_key;


-- -----------------------------------------------------------------------------
-- 17. scoreDiffToNext（次候補との差）別の採用率
-- 2位との差が大きいとき採用されやすいかを確認する
-- 取得元: "metadataJson"->>'scoreDiffToNext'
-- scoreDiffToNext が null のログは除外する（非整数も除外）
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    ("metadataJson"->>'scoreDiffToNext')::int AS score_diff_to_next
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
    AND "metadataJson" IS NOT NULL
    AND "metadataJson"->>'scoreDiffToNext' IS NOT NULL
    AND trim("metadataJson"->>'scoreDiffToNext') <> ''
    AND trim("metadataJson"->>'scoreDiffToNext') ~ '^-?[0-9]+$'
)
SELECT
  score_diff_to_next,
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY score_diff_to_next
ORDER BY score_diff_to_next DESC NULLS LAST;


-- -----------------------------------------------------------------------------
-- 18. 比較文が出ている候補の採用率
-- isComparativeRecommendation が true のログが採用されやすいかを確認する
-- 取得元: "metadataJson"->>'isComparativeRecommendation'（JSON 真偽値は ->> で 'true' / 'false'）
-- キーが無い・空のログは is_comparative_recommendation = '(未設定)' として集約する
-- -----------------------------------------------------------------------------
WITH decision_events AS (
  SELECT
    "eventType",
    CASE
      WHEN "metadataJson"->>'isComparativeRecommendation' IS NULL
        OR trim("metadataJson"->>'isComparativeRecommendation') = ''
        THEN '(未設定)'
      WHEN lower(trim("metadataJson"->>'isComparativeRecommendation')) IN ('true', 't', '1', 'yes')
        THEN 'true'
      WHEN lower(trim("metadataJson"->>'isComparativeRecommendation')) IN ('false', 'f', '0', 'no')
        THEN 'false'
      ELSE trim("metadataJson"->>'isComparativeRecommendation')
    END AS is_comparative_recommendation
  FROM "ai_task_candidate_events"
  WHERE "eventType" IN ('ACCEPTED', 'SNOOZED', 'DISMISSED')
    AND "metadataJson" IS NOT NULL
)
SELECT
  is_comparative_recommendation,
  COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::bigint AS accepted,
  COUNT(*) FILTER (WHERE "eventType" = 'SNOOZED')::bigint AS snoozed,
  COUNT(*) FILTER (WHERE "eventType" = 'DISMISSED')::bigint AS dismissed,
  COUNT(*)::bigint AS total,
  ROUND(
    COUNT(*) FILTER (WHERE "eventType" = 'ACCEPTED')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
    3
  ) AS accept_rate
FROM decision_events
GROUP BY is_comparative_recommendation
ORDER BY
  CASE is_comparative_recommendation
    WHEN 'true' THEN 1
    WHEN 'false' THEN 2
    ELSE 3
  END,
  is_comparative_recommendation;
