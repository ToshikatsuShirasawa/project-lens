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
