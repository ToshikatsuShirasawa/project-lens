import type { TaskCandidate } from '@/lib/types'
import type { TaskCandidateScoreResult } from '@/lib/ai/task-candidate-score'

const MAX_PRIORITY_REASON_LENGTH = 40

function truncateSingleLine(text: string, maxLength = MAX_PRIORITY_REASON_LENGTH): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= maxLength) return oneLine
  return `${oneLine.slice(0, maxLength - 1)}…`
}

function collectExtractionKeywords(candidate: TaskCandidate): string {
  return (candidate.extractionReasons ?? []).join(' ')
}

export function buildTaskCandidatePriorityReason(
  candidate: TaskCandidate,
  score: TaskCandidateScoreResult
): string {
  const extractionKeywords = collectExtractionKeywords(candidate)
  const waitingSignal =
    candidate.extractionStatus === 'waiting' ||
    /回答待ち|確認待ち|返信待ち|レビュー待ち|先方確認中/.test(extractionKeywords)
  if (waitingSignal) {
    return truncateSingleLine('返答・確認待ちのためフォローが必要')
  }
  if (score.scoreBreakdown.actionability < 0 || score.scoreBreakdown.extractionStatusAdjustment < 0) {
    return truncateSingleLine('直接着手が難しいため優先度は低め')
  }

  if (score.scoreBreakdown.urgency >= 2 && score.scoreBreakdown.assignee >= 1) {
    return truncateSingleLine('緊急性が高く、担当候補も明確')
  }

  if (score.scoreBreakdown.hasConcreteTaskSignal && score.scoreBreakdown.actionability >= 1) {
    return truncateSingleLine('具体的な修正タスクで即対応可能')
  }

  if (score.scoreBreakdown.hasConfirmationSignal) {
    return truncateSingleLine('確認依頼があり、早めの対応が必要')
  }

  if (score.scoreBreakdown.hasDecisionSignal) {
    return truncateSingleLine('決定事項に紐づくため着手しやすい')
  }

  if (score.scoreBreakdown.specificity < 0) {
    return truncateSingleLine('要件が抽象的なため優先度は低め')
  }

  if (score.scoreBreakdown.actionability >= 2) {
    return truncateSingleLine('担当と期限が見えており着手しやすい')
  }

  return truncateSingleLine('根拠はあるが追加確認後の着手が安全')
}
