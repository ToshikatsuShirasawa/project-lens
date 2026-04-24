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
