import { describe, expect, it } from 'vitest'
import type { TaskCandidate } from '@/lib/types'
import { scoreTaskCandidate } from '../task-candidate-score'
import { buildTaskCandidatePriorityReason } from '../task-candidate-priority-reason'

function makeCandidate(overrides: Partial<TaskCandidate> = {}): TaskCandidate {
  return {
    id: 'candidate-1',
    title: 'API修正',
    reason: '作業報告に対応が必要な事項がありました',
    source: 'report',
    extractionStatus: 'todo',
    extractionReasons: ['todo: 修正'],
    ...overrides,
  }
}

describe('buildTaskCandidatePriorityReason', () => {
  it('waiting シグナルがあると低優先メッセージを返す', () => {
    const candidate = makeCandidate({
      extractionStatus: 'waiting',
      extractionReasons: ['waiting: 回答待ち'],
    })
    const score = scoreTaskCandidate(candidate)

    expect(buildTaskCandidatePriorityReason(candidate, score)).toBe('返答・確認待ちのためフォローが必要')
  })

  it('緊急かつ担当候補ありで緊急メッセージを返す', () => {
    const candidate = makeCandidate({
      title: '明日までにAPI修正が必要',
      suggestedAssignee: '田中',
    })
    const score = scoreTaskCandidate(candidate)

    expect(buildTaskCandidatePriorityReason(candidate, score)).toBe('緊急性が高く、担当候補も明確')
  })

  it('長文は40文字以内に省略される', () => {
    const candidate = makeCandidate({
      title: '洗い出しと検討の対応',
    })
    const score = scoreTaskCandidate(candidate)
    const reason = buildTaskCandidatePriorityReason(candidate, score)

    expect(reason.length).toBeLessThanOrEqual(40)
  })
})
