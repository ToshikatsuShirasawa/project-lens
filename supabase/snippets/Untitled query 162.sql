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
