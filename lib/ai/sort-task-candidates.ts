import { scoreTaskCandidate } from './task-candidate-score'
import type { TaskCandidate } from '@/lib/types'
import type { TaskCandidateScoreResult } from './task-candidate-score'

type Scorer = (c: TaskCandidate) => TaskCandidateScoreResult

/**
 * AIタスク候補をUI表示順に並べ替える。
 *
 * 並び順:
 *   1. extractionStatus === 'waiting' の候補を末尾へ
 *   2. score 降順
 *   3. score 同点 → specificity 降順
 *   4. specificity 同点 → mergedCount 降順
 *   5. それ以外 → 元の順序を維持（安定ソート）
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
      score: result.score,
      specificity: result.scoreBreakdown.specificity,
    }
  })

  decorated.sort((a, b) => {
    const aWaiting = a.candidate.extractionStatus === 'waiting' ? 1 : 0
    const bWaiting = b.candidate.extractionStatus === 'waiting' ? 1 : 0
    if (aWaiting !== bWaiting) return aWaiting - bWaiting

    if (b.score !== a.score) return b.score - a.score

    if (b.specificity !== a.specificity) return b.specificity - a.specificity

    const aMerged = a.candidate.mergedCount ?? 1
    const bMerged = b.candidate.mergedCount ?? 1
    if (bMerged !== aMerged) return bMerged - aMerged

    return a.index - b.index
  })

  return decorated.map(({ candidate }) => candidate)
}
