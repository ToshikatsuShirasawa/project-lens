import { summarizeCandidateReasons } from '@/lib/ai/candidate-reason-summary'
import type { TaskCandidate } from '@/lib/types'

export type AiTaskCandidateEventTypeApi = 'shown' | 'accepted' | 'snoozed' | 'dismissed'

const SOURCE_LABEL: Record<TaskCandidate['source'], string> = {
  slack: 'Slack',
  report: '作業報告',
  meeting: '議事録',
  ai: 'AI検出',
}

export interface LogAiTaskCandidateEventPayload {
  projectId: string
  candidateId: string
  eventType: AiTaskCandidateEventTypeApi
  candidateTitle: string
  candidateSource: string
  confidenceLevel: string
  recommendationReason: string | null
  structuredReasons: string[]
  createdTaskId?: string | null
  metadata?: Record<string, unknown> | null
}

/** 候補と理由サマリから API 送信用ペイロードを組み立てる */
export function buildAiTaskCandidateEventPayload(
  projectId: string,
  candidate: TaskCandidate,
  eventType: AiTaskCandidateEventTypeApi,
  options: {
    isTopCandidate: boolean
    createdTaskId?: string | null
    metadata?: Record<string, unknown> | null
  }
): LogAiTaskCandidateEventPayload {
  const summary = summarizeCandidateReasons(candidate, {
    isTopCandidate: options.isTopCandidate,
    maxChips: 4,
  })
  const structuredReasons = summary.chips.map((c) => c.label)
  return {
    projectId,
    candidateId: candidate.id,
    eventType,
    candidateTitle: candidate.title,
    candidateSource: SOURCE_LABEL[candidate.source],
    confidenceLevel: summary.confidenceLevel,
    recommendationReason: summary.recommendationReason,
    structuredReasons,
    createdTaskId: options.createdTaskId,
    metadata: {
      ...(options.metadata ?? {}),
      candidateSourceKey: candidate.source,
    },
  }
}

/** サーバーが期待する JSON 形（余分なキーは送らない） */
function toRequestBody(payload: LogAiTaskCandidateEventPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    projectId: payload.projectId,
    candidateId: payload.candidateId,
    eventType: payload.eventType,
    candidateTitle: payload.candidateTitle,
    candidateSource: payload.candidateSource,
    confidenceLevel: payload.confidenceLevel,
    recommendationReason: payload.recommendationReason,
    structuredReasons: payload.structuredReasons,
  }
  if (payload.createdTaskId !== undefined && payload.createdTaskId !== null) {
    body.createdTaskId = payload.createdTaskId
  }
  body.metadata = payload.metadata ?? {}
  return body
}

/**
 * AI候補イベントを記録する。失敗しても例外は投げず、UI を止めない。
 */
export function logAiTaskCandidateEvent(payload: LogAiTaskCandidateEventPayload): void {
  const body = toRequestBody(payload)
  void fetch('/api/ai-task-candidate-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn('[logAiTaskCandidateEvent]', res.status, text)
      }
    })
    .catch((e) => {
      console.warn('[logAiTaskCandidateEvent] fetch failed', e)
    })
}
