import { describe, expect, it } from 'vitest'
import { extractTaskCandidatesFromReports } from '../extract-task-candidates-from-reports'
import { mergeTaskCandidates } from '../merge-task-candidates'
import type { SourceType, TaskCandidate, WorkReport } from '@/lib/types'

function reportLike(
  id: string,
  text: string,
  source: SourceType = 'memo',
  submittedBy = '自分',
): WorkReport {
  return {
    id,
    completed: '',
    inProgress: '',
    blockers: '',
    nextActions: text,
    submittedAt: '2026-05-01T00:00:00.000Z',
    submittedBy,
    candidateSource: source,
    candidateReasonSourceLabel: source === 'slack' ? 'Slackメモ' : source === 'meeting' ? '議事録' : 'メモ',
    candidateIdPrefix: 'input',
  }
}

function displayTitles(candidates: TaskCandidate[]): string[] {
  return candidates.map((candidate) => candidate.displayTitle ?? candidate.title)
}

describe('議事録・メモ由来の候補抽出品質', () => {
  it('Slack風メモから自然な候補タイトルを抽出する', () => {
    const text = `田中：
API仕様ちょっと怪しいので確認必要かも

佐藤：
ログも変なので修正したい

山本：
明日までにエラー画面直せそう？

自分：
一旦修正入れて、あとで追加確認します`

    const titles = displayTitles(extractTaskCandidatesFromReports([reportLike('slack-1', text, 'slack')], 'p1'))

    expect(titles).toEqual([
      'API仕様を確認する',
      'ログを修正する',
      'エラー画面を修正する',
      '追加確認を行う',
    ])
    expect(titles).not.toContain('田中')
  })

  it('議事録風メモでは見出しや決定事項を過抽出せず、確認事項とTODOを抽出する', () => {
    const text = `本日の定例で以下を確認した。

決定事項：
- 初回リリースでは通知機能は対象外とする
- 管理画面の文言は今週中に調整する

確認事項：
- 権限設定の仕様を田中さんに確認する
- 本番反映手順を再確認する

TODO：
- エラー時の表示文言を修正する
- ダッシュボードの表示速度を確認する`

    const titles = displayTitles(extractTaskCandidatesFromReports([reportLike('meeting-1', text, 'meeting')], 'p1'))

    expect(titles).toEqual([
      '管理画面の文言を調整する',
      '権限設定の仕様を確認する',
      '本番反映手順を再確認',
      'エラー時の表示文言修正',
      'ダッシュボードの表示速度確認',
    ])
    expect(titles).not.toContain('本日の定例で以下を確認した')
    expect(titles).not.toContain('確認事項：')
    expect(titles).not.toContain('TODO：')
    expect(titles).not.toContain('初回リリースでは通知機能は対象外とする')
  })

  it('雑メモでは感想と待ち状態を除外し、見直しタスクだけを抽出する', () => {
    const text = `今日は全体的に進捗は悪くなかった。
画面の雰囲気はだいぶ良くなってきた。
ただ、候補カードの文言はもう少し分かりやすくしたい。
あと、設定画面の導線は後で見直す。
山田さんからの返答待ち。`

    const titles = displayTitles(extractTaskCandidatesFromReports([reportLike('memo-1', text, 'memo')], 'p1'))

    expect(titles).toEqual(['候補カードの文言を見直す', '設定画面の導線を見直す'])
  })

  it('作業報告由来とメモ由来の類似候補を横断して統合する', () => {
    const workReport = {
      id: 'report-1',
      completed: '',
      inProgress: '',
      blockers: '',
      nextActions: `API仕様の確認が必要です。
ログ出力の修正が必要です。`,
      submittedAt: '2026-05-01T00:00:00.000Z',
      submittedBy: '自分',
    }
    const memo = reportLike(
      'memo-2',
      `API仕様を確認する必要がある。
ログも変なので修正したい。`,
      'memo',
    )

    const merged = mergeTaskCandidates(extractTaskCandidatesFromReports([workReport, memo], 'p1'))
    const titles = displayTitles(merged)

    expect(titles).toHaveLength(2)
    expect(titles).toEqual(expect.arrayContaining(['API仕様確認', 'ログ出力修正']))
    expect(merged.every((candidate) => candidate.mergedCount === 2)).toBe(true)
    expect(merged.map((candidate) => candidate.mergedSources)).toEqual([
      expect.arrayContaining(['report', 'memo']),
      expect.arrayContaining(['report', 'memo']),
    ])
  })
})
