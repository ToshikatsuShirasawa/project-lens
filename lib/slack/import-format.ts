import type { SlackImportRangePreset } from '@/lib/generated/prisma/client'

export const SLACK_RANGE_LABELS: Record<SlackImportRangePreset, string> = {
  LAST_24_HOURS: '直近24時間',
  LAST_3_DAYS: '直近3日',
  LAST_7_DAYS: '直近7日',
}

const RANGE_SECONDS: Record<SlackImportRangePreset, number> = {
  LAST_24_HOURS: 24 * 60 * 60,
  LAST_3_DAYS: 3 * 24 * 60 * 60,
  LAST_7_DAYS: 7 * 24 * 60 * 60,
}

export interface SlackMessageForImportText {
  userName?: string | null
  userId?: string | null
  text: string
}

export function slackRangeToTimestamps(
  rangePreset: SlackImportRangePreset,
  now = new Date()
): { oldestTs: string; latestTs: string } {
  const latestSeconds = Math.floor(now.getTime() / 1000)
  return {
    latestTs: String(latestSeconds),
    oldestTs: String(latestSeconds - RANGE_SECONDS[rangePreset]),
  }
}

export function formatSlackImportTitle(channelName: string, rangePreset: SlackImportRangePreset): string {
  return `#${channelName} / ${SLACK_RANGE_LABELS[rangePreset]}`
}

export function formatSlackMessagesForProjectInput(
  channelName: string,
  rangePreset: SlackImportRangePreset,
  messages: SlackMessageForImportText[]
): string {
  const header = formatSlackImportTitle(channelName, rangePreset)
  const lines = messages
    .map((message) => {
      const text = message.text.replace(/\s+/g, ' ').trim()
      if (!text) return ''
      const author = message.userName?.trim() || message.userId?.trim() || '不明'
      return `${author}: ${text}`
    })
    .filter(Boolean)
  return [header, ...lines].join('\n')
}
