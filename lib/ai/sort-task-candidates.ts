import { scoreTaskCandidate } from './task-candidate-score'
import type { TaskCandidate } from '@/lib/types'
import type { TaskCandidateScoreResult } from './task-candidate-score'

type Scorer = (c: TaskCandidate) => TaskCandidateScoreResult

const URGENCY_KEYWORDS = ['今日', '本日', '明日', '期限', 'まで', '今週中'] as const
const FAST_TRACK_KEYWORDS = ['早め', '至急', '急ぎ'] as const
const ACTION_KEYWORDS = ['修正', '対応', '実装', '作成', '更新', '調整'] as const
const REVIEW_KEYWORDS = ['確認', '調査', '検討'] as const
const EXPLICIT_NECESSITY_KEYWORDS = ['要対応', '要確認'] as const
const RISK_KEYWORDS = ['エラー', '不具合', '障害', 'ブロッカー'] as const

function hasAnyKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function candidatePriorityText(candidate: TaskCandidate): string {
  return [
    candidate.displayTitle,
    candidate.title,
    candidate.reason,
    ...(candidate.extractionReasons ?? []),
  ]
    .filter(Boolean)
    .join(' ')
}

export function scoreTaskCandidateDisplayPriority(candidate: TaskCandidate): number {
  const text = candidatePriorityText(candidate)
  let score = 0

  if (hasAnyKeyword(text, URGENCY_KEYWORDS)) score += 3
  if (hasAnyKeyword(text, FAST_TRACK_KEYWORDS)) score += 3
  const hasActionKeyword = hasAnyKeyword(text, ACTION_KEYWORDS)
  const hasReviewKeyword = hasAnyKeyword(text, REVIEW_KEYWORDS)
  if (hasActionKeyword) score += 2
  if (hasReviewKeyword) score += 1
  if (
    hasAnyKeyword(text, EXPLICIT_NECESSITY_KEYWORDS) ||
    (text.includes('必要') && !hasReviewKeyword)
  ) {
    score += 2
  }
  if (hasAnyKeyword(text, RISK_KEYWORDS)) score += 2

  return score
}

/**
 * AIタスク候補をUI表示順に並べ替える。
 *
 * 並び順:
 *   1. extractionStatus === 'waiting' の候補を末尾へ
 *   2. 軽量な表示優先度スコア降順
 *   3. score 降順
 *   4. score 同点 → specificity 降順
 *   5. specificity 同点 → mergedCount 降順
 *   6. それ以外 → 元の順序を維持（安定ソート）
 */
export function sortTaskCandidatesForDisplay(
  candidates: TaskCandidate[],
  scorer: Scorer = scoreTaskCandidate
): TaskCandidate[] {
  const decorated = candidates.map((candidate, index) => {
    const result = scorer(candidate)
    return {
      candidate,
      index,
      displayPriorityScore: scoreTaskCandidateDisplayPriority(candidate),
      score: result.score,
      specificity: result.scoreBreakdown.specificity,
    }
  })

  decorated.sort((a, b) => {
    const aWaiting = a.candidate.extractionStatus === 'waiting' ? 1 : 0
    const bWaiting = b.candidate.extractionStatus === 'waiting' ? 1 : 0
    if (aWaiting !== bWaiting) return aWaiting - bWaiting

    if (b.displayPriorityScore !== a.displayPriorityScore) {
      return b.displayPriorityScore - a.displayPriorityScore
    }

    if (b.score !== a.score) return b.score - a.score

    if (b.specificity !== a.specificity) return b.specificity - a.specificity

    const aMerged = a.candidate.mergedCount ?? 1
    const bMerged = b.candidate.mergedCount ?? 1
    if (bMerged !== aMerged) return bMerged - aMerged

    return a.index - b.index
  })

  return decorated.map(({ candidate }) => candidate)
}
