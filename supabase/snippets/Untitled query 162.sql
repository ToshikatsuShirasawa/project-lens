select
  "metadataJson"->>'extractionStatus' as extraction_status,
  "eventType" as event_type,
  count(*) as count
from ai_task_candidate_events
group by
  "metadataJson"->>'extractionStatus',
  "eventType"
order by
  extraction_status,
  event_type;