import { describe, it, expect } from 'vitest'
import { sortTaskCandidatesForDisplay } from '../sort-task-candidates'
import type { TaskCandidate } from '@/lib/types'
import type { TaskCandidateScoreResult } from '../task-candidate-score'

// ─── helpers ──────────────────────────────────────────────────────

function makeCandidate(
  id: string,
  overrides: Partial<TaskCandidate> = {}
): TaskCandidate {
  return {
    id,
    title: id,
    reason: '',
    source: 'ai',
    ...overrides,
  }
}

function makeScoreResult(score: number, specificity: number): TaskCandidateScoreResult {
  return {
    score,
    confidenceLevel: 'medium',
    recommendationReason: '',
    scoreBreakdown: {
      sourceKey: 'ai',
      source: 0,
      reason: 0,
      rawReason: 0,
      assignee: 0,
      dueDate: 0,
      actionability: 0,
      actionabilityReason: '',
      urgency: 0,
      urgencyReason: '',
      hasConfirmationSignal: false,
      hasDecisionSignal: false,
      specificity,
      hasConcreteTaskSignal: false,
      hasAbstractOnlySignal: false,
      specificityReason: '',
      extractionStatusAdjustment: 0,
    },
    legacyConfidenceLevel: 'medium',
  }
}

/** id → { score, specificity } のマップを受け取りスコアラーを返す */
function makeScorer(
  map: Record<string, { score: number; specificity: number }>
): (c: TaskCandidate) => TaskCandidateScoreResult {
  return (c) => {
    const s = map[c.id] ?? { score: 0, specificity: 0 }
    return makeScoreResult(s.score, s.specificity)
  }
}

// ─── tests ────────────────────────────────────────────────────────

describe('sortTaskCandidatesForDisplay', () => {
  it('score が高い候補を上に表示する', () => {
    const candidates = [
      makeCandidate('low'),
      makeCandidate('high'),
    ]
    const scorer = makeScorer({ low: { score: 3, specificity: 0 }, high: { score: 7, specificity: 0 } })

    const result = sortTaskCandidatesForDisplay(candidates, scorer)

    expect(result.map((c) => c.id)).toEqual(['high', 'low'])
  })

  it('waiting 候補を末尾に配置する', () => {
    const candidates = [
      makeCandidate('waiting', { extractionStatus: 'waiting' }),
      makeCandidate('todo', { extractionStatus: 'todo' }),
      makeCandidate('unknown', { extractionStatus: 'unknown' }),
    ]
    const scorer = makeScorer({
      waiting: { score: 8, specificity: 2 },
      todo: { score: 3, specificity: 0 },
      unknown: { score: 1, specificity: 0 },
    })

    const result = sortTaskCandidatesForDisplay(candidates, scorer)

    expect(result[result.length - 1].id).toBe('waiting')
  })

  it('score 同点の場合、specificity が高い候補を上に表示する', () => {
    const candidates = [
      makeCandidate('abstract'),
      makeCandidate('concrete'),
    ]
    const scorer = makeScorer({
      abstract: { score: 5, specificity: -1 },
      concrete: { score: 5, specificity: 2 },
    })

    const result = sortTaskCandidatesForDisplay(candidates, scorer)

    expect(result.map((c) => c.id)).toEqual(['concrete', 'abstract'])
  })

  it('score / specificity 同点の場合、mergedCount が多い候補を上に表示する', () => {
    const candidates = [
      makeCandidate('single', { mergedCount: 1 }),
      makeCandidate('merged', { mergedCount: 3 }),
    ]
    const scorer = makeScorer({
      single: { score: 5, specificity: 1 },
      merged: { score: 5, specificity: 1 },
    })

    const result = sortTaskCandidatesForDisplay(candidates, scorer)

    expect(result.map((c) => c.id)).toEqual(['merged', 'single'])
  })

  it('完全同点の場合、元の順番を維持する', () => {
    const candidates = [
      makeCandidate('first'),
      makeCandidate('second'),
      makeCandidate('third'),
    ]
    const scorer = makeScorer({
      first: { score: 5, specificity: 0 },
      second: { score: 5, specificity: 0 },
      third: { score: 5, specificity: 0 },
    })

    const result = sortTaskCandidatesForDisplay(candidates, scorer)

    expect(result.map((c) => c.id)).toEqual(['first', 'second', 'third'])
  })

  it('空配列を渡した場合は空配列を返す', () => {
    expect(sortTaskCandidatesForDisplay([])).toEqual([])
  })

  it('mergedCount が未設定の候補は 1 として扱う', () => {
    const candidates = [
      makeCandidate('no-merged'),
      makeCandidate('merged', { mergedCount: 2 }),
    ]
    const scorer = makeScorer({
      'no-merged': { score: 5, specificity: 0 },
      merged: { score: 5, specificity: 0 },
    })

    const result = sortTaskCandidatesForDisplay(candidates, scorer)

    expect(result.map((c) => c.id)).toEqual(['merged', 'no-merged'])
  })

  it('waiting が複数ある場合、waiting 内はスコア順・元順序で並ぶ', () => {
    const candidates = [
      makeCandidate('w-low', { extractionStatus: 'waiting' }),
      makeCandidate('w-high', { extractionStatus: 'waiting' }),
      makeCandidate('active', { extractionStatus: 'todo' }),
    ]
    const scorer = makeScorer({
      'w-low': { score: 2, specificity: 0 },
      'w-high': { score: 6, specificity: 0 },
      active: { score: 4, specificity: 0 },
    })

    const result = sortTaskCandidatesForDisplay(candidates, scorer)

    expect(result.map((c) => c.id)).toEqual(['active', 'w-high', 'w-low'])
  })
})
