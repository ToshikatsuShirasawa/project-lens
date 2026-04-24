SELECT
  "candidateTitle",
  "eventType",
  "candidateSource",
  "confidenceLevel",
  "recommendationReason",
  "structuredReasonsJson",
  "metadataJson"->>'score' AS score,
  "metadataJson"->'scoreBreakdown' AS breakdown,
  "createdAt"
FROM "ai_task_candidate_events"
WHERE "candidateTitle" LIKE '%セキュリティ%'
ORDER BY "createdAt" DESC;