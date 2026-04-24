import { summarizeCandidateReasons } from '@/lib/ai/candidate-reason-summary'
import type { TaskCandidate } from '@/lib/types'

export type TaskCandidateScoreConfidence = 'high' | 'medium' | 'review'

export type TaskCandidateScoreResult = {
  score: number
  confidenceLevel: TaskCandidateScoreConfidence
  recommendationReason: string
  scoreBreakdown: {
    source: number
    reason: number
    rawReason: number
    assignee: number
    dueDate: number
  }
  /** summarizeCandidateReasons ベース（ログや調整用） */
  legacyConfidenceLevel: TaskCandidateScoreConfidence
}

/** 表示・ログ用の重み（ログ分析に合わせて調整しやすいよう定数化） */
const SOURCE_WEIGHT: Record<TaskCandidate['source'], number> = {
  slack: 2,
  meeting: 2,
  report: 1,
  ai: 0,
}

/** チップラベル（および近い表現）→ reason ブロックへの加点。未登録ラベルは 0 */
const REASON_LABEL_WEIGHTS: Record<string, number> = {
  期限が近い: 3,
  確認依頼あり: 3,
  'Slackで確認依頼': 3,
  決定事項に紐づく: 2,
  担当候補あり: 1,
  言及あり: 1,
}

const MAX_REASON_SCORE = 5

const REASON_LABEL_GROUPS = {
  confirmation: ['確認依頼あり', 'Slackで確認依頼'],
  dueSoon: ['期限が近い'],
  decision: ['決定事項に紐づく'],
  assignee: ['担当候補あり'],
  mention: ['言及あり'],
} as const

const RANK: Record<TaskCandidateScoreConfidence, number> = {
  review: 0,
  medium: 1,
  high: 2,
}

function hasNonEmpty(s: string | undefined): boolean {
  return Boolean(s?.trim())
}

function collectReasonLabels(candidate: TaskCandidate): Set<string> {
  const summary = summarizeCandidateReasons(candidate, { isTopCandidate: false, maxChips: 8 })
  return new Set(summary.chips.map((chip) => chip.label))
}

function scoreReasonFromLabels(labels: Set<string>): number {
  let total = 0
  for (const groupLabels of Object.values(REASON_LABEL_GROUPS)) {
    const matchedLabel = groupLabels.find((label) => labels.has(label))
    if (!matchedLabel) continue
    const w = REASON_LABEL_WEIGHTS[matchedLabel]
    if (w === undefined || w === 0) continue
    total += w
  }
  return total
}

function scoreReasonBucket(labels: Set<string>): { rawReason: number; reason: number } {
  const rawReason = scoreReasonFromLabels(labels)
  const reason = Math.min(rawReason, MAX_REASON_SCORE)
  return { rawReason, reason }
}

function scoreSourceBucket(candidate: TaskCandidate): number {
  return SOURCE_WEIGHT[candidate.source] ?? 0
}

function scoreAssigneeBucket(candidate: TaskCandidate): number {
  return hasNonEmpty(candidate.suggestedAssignee) ? 1 : 0
}

function scoreDueDateBucket(candidate: TaskCandidate): number {
  return hasNonEmpty(candidate.suggestedDueDate) ? 1 : 0
}

function confidenceFromScore(score: number): TaskCandidateScoreConfidence {
  if (score >= 6) return 'high'
  if (score >= 3) return 'medium'
  return 'review'
}

/**
 * スコア由来の段階と、チップ重み由来の段階が 2 段以上離れる場合にのみ調整する。
 * （「high なのに review だけ」などの極端な表示ズレを抑える）
 */
function mergeConfidenceWithLegacy(
  fromScore: TaskCandidateScoreConfidence,
  legacy: TaskCandidateScoreConfidence
): TaskCandidateScoreConfidence {
  const d = RANK[fromScore] - RANK[legacy]
  if (d >= 2 || d <= -2) {
    return 'medium'
  }
  return fromScore
}

function buildRecommendationReason(candidate: TaskCandidate, labels: Set<string>): string {
  const hasDeadline = labels.has('期限が近い')
  const hasConfirm =
    labels.has('確認依頼あり') || labels.has('Slackで確認依頼') || /確認依頼|お願いします|対応お願い/.test(candidate.reason ?? '')
  const hasDecision = labels.has('決定事項に紐づく')

  if (hasDeadline && hasConfirm) {
    return '期限が近く、確認依頼もあるため候補化しています'
  }
  if (candidate.source === 'slack' && hasConfirm) {
    return '確認依頼があるため候補化しています'
  }
  if (hasDecision) {
    return '決定事項に紐づくため候補化しています'
  }
  if (candidate.source === 'slack') {
    return 'Slack由来の情報から候補化しています'
  }
  if (candidate.source === 'meeting') {
    return '議事録の内容に基づき候補化しています'
  }
  if (candidate.source === 'report') {
    return '作業報告の内容に基づき候補化しています'
  }
  return '複数のシグナルから候補化しています'
}

export function scoreTaskCandidate(candidate: TaskCandidate): TaskCandidateScoreResult {
  const labels = collectReasonLabels(candidate)
  const legacy = summarizeCandidateReasons(candidate, { isTopCandidate: false, maxChips: 4 }).confidenceLevel

  const source = scoreSourceBucket(candidate)
  const { rawReason, reason } = scoreReasonBucket(labels)
  const assignee = scoreAssigneeBucket(candidate)
  const dueDate = scoreDueDateBucket(candidate)
  const score = source + reason + assignee + dueDate

  const rawTier = confidenceFromScore(score)
  const confidenceLevel = mergeConfidenceWithLegacy(rawTier, legacy)
  const recommendationReason = buildRecommendationReason(candidate, labels)

  return {
    score,
    confidenceLevel,
    recommendationReason,
    scoreBreakdown: { source, reason, rawReason, assignee, dueDate },
    legacyConfidenceLevel: legacy,
  }
}

/**
 * score 降順。同点は元配列の順序を維持。
 * `held: true`（あとで）の候補は末尾にまとめる（スコアより優先度を下げる）。
 */
export function sortTaskCandidatesByScore(candidates: TaskCandidate[]): TaskCandidate[] {
  const decorated = candidates.map((c, originalIndex) => ({
    c,
    originalIndex,
    held: Boolean(c.held),
    score: scoreTaskCandidate(c).score,
  }))
  decorated.sort((a, b) => {
    if (a.held !== b.held) {
      return a.held ? 1 : -1
    }
    if (!a.held && !b.held && b.score !== a.score) {
      return b.score - a.score
    }
    return a.originalIndex - b.originalIndex
  })
  return decorated.map((row) => row.c)
}
