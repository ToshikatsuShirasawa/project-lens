select
  "metadataJson"->>'extractionStatus' as extraction_status,
  count(*)
from ai_task_candidate_events
group by "metadataJson"->>'extractionStatus';