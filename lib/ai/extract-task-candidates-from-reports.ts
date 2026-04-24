import type { TaskCandidate, WorkReport } from '@/lib/types'

type ReportLike = Pick<WorkReport, 'id' | 'submittedBy' | 'completed' | 'inProgress' | 'blockers' | 'nextActions'>

const TASK_CANDIDATE_KEYWORDS = [
  '必要',
  '対応',
  '確認',
  '準備',
  '手配',
  '修正',
  '調整',
  '依頼',
  '未対応',
  '課題',
  '次回',
  'TODO',
  '要確認',
] as const

const SENTENCE_SPLIT_PATTERN = /[\n。．！？!?]+/g

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeForDedup(text: string): string {
  return normalizeWhitespace(text).toLowerCase()
}

function splitIntoCandidateSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT_PATTERN)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
}

function containsTaskKeyword(sentence: string): boolean {
  const normalized = sentence.toLowerCase()
  return TASK_CANDIDATE_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()))
}

function trimToTitle(sentence: string, maxLength = 28): string {
  const compact = normalizeWhitespace(sentence)
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, maxLength - 1)}…`
}

function normalizeIsoDate(input: string): string | undefined {
  const ymd = input.match(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/)
  if (ymd) {
    const year = ymd[1]
    const month = ymd[2].padStart(2, '0')
    const day = ymd[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const mmdd = input.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (mmdd) {
    const month = mmdd[1].padStart(2, '0')
    const day = mmdd[2].padStart(2, '0')
    const year = new Date().getFullYear()
    return `${year}-${month}-${day}`
  }
  return undefined
}

function inferDueDate(sentence: string, baseDate = new Date()): string | undefined {
  const normalized = normalizeWhitespace(sentence)
  if (!normalized) return undefined

  const explicitDate = normalizeIsoDate(normalized)
  if (explicitDate) return explicitDate

  const d = new Date(baseDate)
  if (normalized.includes('今日')) {
    return d.toISOString().slice(0, 10)
  }
  if (normalized.includes('明日')) {
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }
  if (normalized.includes('今週')) {
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  }
  if (normalized.includes('来週')) {
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }
  return undefined
}

function buildReason(sentence: string): string {
  if (/要確認|確認/.test(sentence)) {
    return '作業報告に確認が必要な事項がありました'
  }
  if (/対応|修正|調整/.test(sentence)) {
    return '作業報告に対応が必要な事項がありました'
  }
  return '作業報告にタスク化候補の表現がありました'
}

export function extractTaskCandidatesFromReports(reports: ReportLike[]): TaskCandidate[] {
  const candidates: TaskCandidate[] = []
  const seenTitles = new Set<string>()

  for (const report of reports) {
    const assignee = normalizeWhitespace(report.submittedBy)
    const reportText = [report.completed, report.inProgress, report.blockers, report.nextActions]
      .map((part) => part ?? '')
      .join('\n')
    const sentences = splitIntoCandidateSentences(reportText)
    let reportCandidateIndex = 0

    for (const sentence of sentences) {
      if (!containsTaskKeyword(sentence)) continue
      const title = trimToTitle(sentence)
      const normalizedTitle = normalizeForDedup(title)
      if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue
      seenTitles.add(normalizedTitle)

      const excerpt = trimToTitle(sentence, 36)
      const reasonBase = buildReason(sentence)
      const reason = `${reasonBase}（抜粋: ${excerpt}）`

      candidates.push({
        id: `report-${report.id}-${reportCandidateIndex}`,
        title,
        reason,
        source: 'report',
        suggestedAssignee: assignee || undefined,
        suggestedDueDate: inferDueDate(sentence),
      })
      reportCandidateIndex += 1
    }
  }

  return candidates
}
