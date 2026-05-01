import { describe, expect, it } from 'vitest'
import {
  formatSlackImportTitle,
  formatSlackMessagesForProjectInput,
  slackRangeToTimestamps,
} from '../import-format'

describe('Slack import formatting', () => {
  it('range presetからSlack timestamp範囲を作る', () => {
    const now = new Date('2026-05-01T00:00:00.000Z')
    expect(slackRangeToTimestamps('LAST_24_HOURS', now)).toEqual({
      latestTs: '1777593600',
      oldestTs: '1777507200',
    })
  })

  it('project_inputs保存用のタイトルと本文を整形する', () => {
    expect(formatSlackImportTitle('project-web-site', 'LAST_24_HOURS')).toBe(
      '#project-web-site / 直近24時間',
    )
    expect(
      formatSlackMessagesForProjectInput('project-web-site', 'LAST_24_HOURS', [
        { userName: '田中', text: 'API仕様ちょっと怪しいので確認必要かも' },
        { userName: '佐藤', text: 'ログも変なので修正したい' },
      ]),
    ).toBe(
      [
        '#project-web-site / 直近24時間',
        '田中: API仕様ちょっと怪しいので確認必要かも',
        '佐藤: ログも変なので修正したい',
      ].join('\n'),
    )
  })
})
