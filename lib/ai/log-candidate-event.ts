import { summarizeCandidateReasons } from '@/lib/ai/candidate-reason-summary'
import { scoreTaskCandidate } from '@/lib/ai/task-candidate-score'
import type { TaskCandidate } from '@/lib/types'

export type AiTaskCandidateEventTypeApi = 'shown' | 'accepted' | 'snoozed' | 'dismissed'

const SOURCE_LABEL: Record<TaskCandidate['source'], string> = {
  slack: 'Slackメモ',
  report: '作業報告',
  meeting: '議事録',
  memo: 'メモ',
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
    recommendationReasonOverride?: string
    scoreDiffToNext?: number | null
    isComparativeRecommendation?: boolean
  }
): LogAiTaskCandidateEventPayload {
  const summary = summarizeCandidateReasons(candidate, {
    isTopCandidate: false,
    maxChips: 4,
  })
  const structuredReasons = summary.chips.map((c) => c.label)
  const scored = scoreTaskCandidate(candidate)
  return {
    projectId,
    candidateId: candidate.id,
    eventType,
    candidateTitle: candidate.displayTitle ?? candidate.title,
    candidateSource: SOURCE_LABEL[candidate.source],
    confidenceLevel: scored.confidenceLevel,
    recommendationReason: options.recommendationReasonOverride ?? scored.recommendationReason,
    structuredReasons,
    createdTaskId: options.createdTaskId,
    metadata: {
      ...(options.metadata ?? {}),
      candidateSourceKey: candidate.source,
      isTopCandidate: options.isTopCandidate,
      score: scored.score,
      scoreBreakdown: scored.scoreBreakdown,
      scoreDiffToNext: options.scoreDiffToNext ?? null,
      isComparativeRecommendation: Boolean(options.isComparativeRecommendation),
      legacyConfidenceLevel: scored.legacyConfidenceLevel,
      extractionStatus: candidate.extractionStatus ?? null,
      extractionReasons: candidate.extractionReasons ?? null,
      extractionConfidence: candidate.extractionConfidence ?? null,
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
