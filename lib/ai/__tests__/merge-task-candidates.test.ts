import { describe, it, expect } from 'vitest'
import { buildTaskCandidateKey, mergeTaskCandidates } from '../merge-task-candidates'
import type { TaskCandidate } from '@/lib/types'

// ─── buildTaskCandidateKey ────────────────────────────────────

describe('buildTaskCandidateKey', () => {
  it('小文字化する', () => {
    expect(buildTaskCandidateKey('API修正')).toBe('api修正')
  })

  it('助詞「の」を削除する', () => {
    expect(buildTaskCandidateKey('APIの修正')).toBe('api修正')
  })

  it('助詞「を」を削除する', () => {
    expect(buildTaskCandidateKey('APIを修正')).toBe('api修正')
  })

  it('助詞「に」を削除する', () => {
    expect(buildTaskCandidateKey('詳細画面に追加')).toBe('詳細画面追加')
  })

  it('助詞「が」を削除する', () => {
    expect(buildTaskCandidateKey('確認が必要')).toBe('確認必要')
  })

  it('助詞「は」を削除する', () => {
    expect(buildTaskCandidateKey('設計書は確認済み')).toBe('設計書確認済み')
  })

  it('空白（半角）を削除する', () => {
    expect(buildTaskCandidateKey('API 修正')).toBe('api修正')
  })

  it('空白（全角）を削除する', () => {
    expect(buildTaskCandidateKey('API　修正')).toBe('api修正')
  })

  it('記号を削除する', () => {
    expect(buildTaskCandidateKey('API修正！')).toBe('api修正')
    expect(buildTaskCandidateKey('（API修正）')).toBe('api修正')
    expect(buildTaskCandidateKey('「API修正」')).toBe('api修正')
  })

  it('「APIの修正」と「API修正」が同一キーになる', () => {
    expect(buildTaskCandidateKey('APIの修正')).toBe(buildTaskCandidateKey('API修正'))
  })

  it('「APIを修正」と「API修正」が同一キーになる', () => {
    expect(buildTaskCandidateKey('APIを修正')).toBe(buildTaskCandidateKey('API修正'))
  })

  it('「詳細画面の確認」と「詳細画面確認」が同一キーになる', () => {
    expect(buildTaskCandidateKey('詳細画面の確認')).toBe(buildTaskCandidateKey('詳細画面確認'))
  })

  it('異なる意味のタイトルは異なるキーになる', () => {
    expect(buildTaskCandidateKey('API修正')).not.toBe(buildTaskCandidateKey('DB設計'))
  })
})

// ─── テスト用ヘルパー ─────────────────────────────────────────

function makeCandidate(overrides: Partial<TaskCandidate> & { id: string; title: string }): TaskCandidate {
  return {
    reason: 'テスト用',
    source: 'report',
    extractionStatus: 'todo',
    extractionReasons: [],
    ...overrides,
  }
}

// ─── mergeTaskCandidates ─────────────────────────────────────

describe('mergeTaskCandidates: 基本動作', () => {
  it('候補が1件の場合はそのまま返す', () => {
    const c = makeCandidate({ id: 'a', title: 'API修正', displayTitle: 'API修正' })
    const result = mergeTaskCandidates([c])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
    expect(result[0].mergedCount).toBeUndefined()
  })

  it('キーが異なる候補は別グループになる', () => {
    const c1 = makeCandidate({ id: 'a', title: 'API修正', displayTitle: 'API修正' })
    const c2 = makeCandidate({ id: 'b', title: 'DB設計', displayTitle: 'DB設計' })
    const result = mergeTaskCandidates([c1, c2])
    expect(result).toHaveLength(2)
  })
})

describe('mergeTaskCandidates: 重複統合', () => {
  it('同一キーの候補をマージして1件に統合する', () => {
    const c1 = makeCandidate({ id: 'a', title: 'APIの修正が必要です', displayTitle: 'API修正' })
    const c2 = makeCandidate({ id: 'b', title: 'API修正する', displayTitle: 'API修正' })
    const result = mergeTaskCandidates([c1, c2])
    expect(result).toHaveLength(1)
  })

  it('mergedCount が統合前の件数と一致する', () => {
    const c1 = makeCandidate({ id: 'a', title: 'APIの修正', displayTitle: 'API修正' })
    const c2 = makeCandidate({ id: 'b', title: 'APIを修正', displayTitle: 'API修正' })
    const c3 = makeCandidate({ id: 'c', title: 'API修正する', displayTitle: 'API修正' })
    const result = mergeTaskCandidates([c1, c2, c3])
    expect(result).toHaveLength(1)
    expect(result[0].mergedCount).toBe(3)
  })

  it('mergedTitles に全元タイトルが含まれる', () => {
    const c1 = makeCandidate({ id: 'a', title: '修正1', displayTitle: 'API修正' })
    const c2 = makeCandidate({ id: 'b', title: '修正2', displayTitle: 'API修正' })
    const result = mergeTaskCandidates([c1, c2])
    expect(result[0].mergedTitles).toEqual(['API修正', 'API修正'])
  })
})

describe('mergeTaskCandidates: score 最大の代表選択', () => {
  it('score が最大の候補が代表になる（suggestedDueDate による差）', () => {
    // suggestedDueDate があると actionability が上がりスコアが高くなる
    const cLow = makeCandidate({
      id: 'low',
      title: 'API修正',
      displayTitle: 'API修正',
      source: 'report',
    })
    const cHigh = makeCandidate({
      id: 'high',
      title: 'API修正',
      displayTitle: 'API修正',
      source: 'report',
      suggestedDueDate: '2025-12-31',
      suggestedAssignee: '担当者',
    })
    const result = mergeTaskCandidates([cLow, cHigh])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('high')
  })

  it('score が同点の場合は元の順序が先の候補が代表になる', () => {
    const c1 = makeCandidate({ id: 'first', title: 'API修正', displayTitle: 'API修正' })
    const c2 = makeCandidate({ id: 'second', title: 'API修正', displayTitle: 'API修正' })
    const result = mergeTaskCandidates([c1, c2])
    expect(result[0].id).toBe('first')
  })
})

describe('mergeTaskCandidates: extractionReasons の union', () => {
  it('グループ内の extractionReasons を重複なく統合する', () => {
    const c1 = makeCandidate({
      id: 'a',
      title: 'API修正',
      displayTitle: 'API修正',
      extractionReasons: ['todo: 必要', 'todo(legacy): 修正'],
    })
    const c2 = makeCandidate({
      id: 'b',
      title: 'API修正',
      displayTitle: 'API修正',
      extractionReasons: ['todo: 必要', 'todo: 要確認'],
    })
    const result = mergeTaskCandidates([c1, c2])
    expect(result[0].extractionReasons).toEqual(
      expect.arrayContaining(['todo: 必要', 'todo(legacy): 修正', 'todo: 要確認'])
    )
    // 重複なし
    const reasons = result[0].extractionReasons ?? []
    const dedupedCount = new Set(reasons).size
    expect(reasons.length).toBe(dedupedCount)
  })
})

describe('mergeTaskCandidates: グループ混在', () => {
  it('マージされるグループとされないグループが混在しても正しく処理する', () => {
    const api1 = makeCandidate({ id: 'api1', title: 'APIの修正', displayTitle: 'API修正' })
    const api2 = makeCandidate({ id: 'api2', title: 'API修正', displayTitle: 'API修正' })
    const db = makeCandidate({ id: 'db', title: 'DB設計', displayTitle: 'DB設計' })
    const result = mergeTaskCandidates([api1, api2, db])
    expect(result).toHaveLength(2)
    const merged = result.find((r) => r.mergedCount === 2)
    const single = result.find((r) => !r.mergedCount || r.mergedCount === 1)
    expect(merged).toBeDefined()
    expect(single?.id).toBe('db')
  })
})
