import { summarizeCandidateReasons } from '@/lib/ai/candidate-reason-summary'
import type { TaskCandidate } from '@/lib/types'

export type TaskCandidateScoreConfidence = 'high' | 'medium' | 'review'

export type TaskCandidateScoreResult = {
  score: number
  confidenceLevel: TaskCandidateScoreConfidence
  recommendationReason: string
  scoreBreakdown: {
    sourceKey: TaskCandidate['source']
    source: number
    reason: number
    rawReason: number
    assignee: number
    dueDate: number
    actionability: number
    urgency: number
    hasConfirmationSignal: boolean
    hasDecisionSignal: boolean
  }
  /** summarizeCandidateReasons ベース（ログや調整用） */
  legacyConfidenceLevel: TaskCandidateScoreConfidence
}

export type ComparativeRecommendationResult = {
  recommendationReason: string
  scoreDiffToNext: number | null
  isComparativeRecommendation: boolean
}

/** source 別の基礎点。ログ分析でここを主調整点にする。 */
const SOURCE_WEIGHTS: Record<TaskCandidate['source'], number> = {
  // 会話起点の依頼・確認が多く、即タスク化しやすい
  slack: 2,
  // 決定事項は強いが、期限未確定のメモも混ざるため中程度
  meeting: 1,
  // 状況共有・報告文脈が混ざるため現時点は控えめ
  report: 1,
  // AI派生のみの候補は単体では加点しない
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
const ACTIONABILITY_WEIGHT = {
  assignee: 1,
  dueDate: 1,
  meetingWithoutDueDate: -1,
  reportWithoutConfirmation: -1,
} as const

type CandidateSignals = {
  hasConfirmationSignal: boolean
  hasDecisionSignal: boolean
  hasDueDate: boolean
  hasAssignee: boolean
}

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
  return SOURCE_WEIGHTS[candidate.source] ?? 0
}

function collectCandidateSignals(candidate: TaskCandidate, labels: Set<string>): CandidateSignals {
  const hasConfirmationSignal =
    labels.has('確認依頼あり') || labels.has('Slackで確認依頼') || /確認依頼|お願いします|対応お願い/.test(candidate.reason ?? '')
  const hasDecisionSignal = labels.has('決定事項に紐づく')
  const hasDueDate = hasNonEmpty(candidate.suggestedDueDate)
  const hasAssignee = hasNonEmpty(candidate.suggestedAssignee)

  return { hasConfirmationSignal, hasDecisionSignal, hasDueDate, hasAssignee }
}

function scoreActionabilityBucket(candidate: TaskCandidate, signals: CandidateSignals): number {
  let score = 0

  if (signals.hasDueDate) score += ACTIONABILITY_WEIGHT.dueDate
  if (signals.hasAssignee) score += ACTIONABILITY_WEIGHT.assignee

  if (candidate.source === 'meeting' && !signals.hasDueDate) {
    score += ACTIONABILITY_WEIGHT.meetingWithoutDueDate
  }
  if (candidate.source === 'report' && !signals.hasConfirmationSignal) {
    score += ACTIONABILITY_WEIGHT.reportWithoutConfirmation
  }

  // 減点が強くなりすぎないよう、最低値を -1 に制限
  return Math.max(score, -1)
}

function scoreUrgencyBucket(labels: Set<string>, signals: CandidateSignals): number {
  if (labels.has('期限が近い')) return 1
  if (signals.hasDueDate && signals.hasConfirmationSignal) return 1
  return 0
}

function scoreNowTaskBucket(actionability: number, urgency: number): number {
  return actionability + urgency
}

function confidenceFromScore(score: number): TaskCandidateScoreConfidence {
  // 閾値は現状維持。ログ分析を見て必要時のみ調整する。
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
  const signals = collectCandidateSignals(candidate, labels)
  const hasConfirm = signals.hasConfirmationSignal
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

function buildPriorityEvidenceText(score: TaskCandidateScoreResult): string {
  const parts: string[] = []
  if (score.scoreBreakdown.urgency >= 1) parts.push('期限が近い')
  if (score.scoreBreakdown.hasConfirmationSignal) parts.push('確認依頼がある')
  if (score.scoreBreakdown.actionability >= 2) parts.push('担当や期限が見えている')
  if (score.scoreBreakdown.hasDecisionSignal) parts.push('決定事項に紐づく')
  if (score.scoreBreakdown.sourceKey === 'slack' && score.scoreBreakdown.source >= 2) {
    parts.push('Slack由来の明確な依頼')
  }
  if (parts.length === 0) return '根拠が比較的そろっている'
  return parts.slice(0, 2).join('、')
}

export function scoreTaskCandidate(candidate: TaskCandidate): TaskCandidateScoreResult {
  const labels = collectReasonLabels(candidate)
  const legacy = summarizeCandidateReasons(candidate, { isTopCandidate: false, maxChips: 4 }).confidenceLevel
  const signals = collectCandidateSignals(candidate, labels)

  const source = scoreSourceBucket(candidate)
  const { rawReason, reason } = scoreReasonBucket(labels)
  const assignee = signals.hasAssignee ? 1 : 0
  const dueDate = signals.hasDueDate ? 1 : 0
  const actionability = scoreActionabilityBucket(candidate, signals)
  const urgency = scoreUrgencyBucket(labels, signals)
  const nowTask = scoreNowTaskBucket(actionability, urgency)
  const score = source + reason + nowTask

  const rawTier = confidenceFromScore(score)
  const confidenceLevel = mergeConfidenceWithLegacy(rawTier, legacy)
  const recommendationReason = buildRecommendationReason(candidate, labels)

  return {
    score,
    confidenceLevel,
    recommendationReason,
    scoreBreakdown: {
      sourceKey: candidate.source,
      source,
      reason,
      rawReason,
      assignee,
      dueDate,
      actionability,
      urgency,
      hasConfirmationSignal: signals.hasConfirmationSignal,
      hasDecisionSignal: signals.hasDecisionSignal,
    },
    legacyConfidenceLevel: legacy,
  }
}

export function buildComparativeRecommendationReason(candidates: TaskCandidate[]): ComparativeRecommendationResult {
  if (candidates.length === 0) {
    return {
      recommendationReason: '根拠があるため、まず確認したい候補です',
      scoreDiffToNext: null,
      isComparativeRecommendation: false,
    }
  }

  const top = scoreTaskCandidate(candidates[0])
  const next = candidates.length >= 2 ? scoreTaskCandidate(candidates[1]) : null
  const diff = next ? top.score - next.score : null
  const evidence = buildPriorityEvidenceText(top)

  if (diff === null) {
    return {
      recommendationReason: `${evidence}ため、まず確認したい候補です`,
      scoreDiffToNext: null,
      isComparativeRecommendation: false,
    }
  }
  if (diff >= 2) {
    return {
      recommendationReason: `他の候補よりも${evidence}ため、優先しています`,
      scoreDiffToNext: diff,
      isComparativeRecommendation: true,
    }
  }
  if (diff <= 0) {
    return {
      recommendationReason: `他の候補と同程度ですが、${evidence}ため先に確認したい候補です`,
      scoreDiffToNext: diff,
      isComparativeRecommendation: true,
    }
  }
  return {
    recommendationReason: `他の候補と近いスコアですが、${evidence}ため先に確認したい候補です`,
    scoreDiffToNext: diff,
    isComparativeRecommendation: true,
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
