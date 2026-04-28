select
  "candidateTitle",
  "eventType",
  ("metadataJson"->>'score')::numeric as score
from ai_task_candidate_events
where "createdAt" >= now() - interval '5 minutes'
order by "createdAt" desc;