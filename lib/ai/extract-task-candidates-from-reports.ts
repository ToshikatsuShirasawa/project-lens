import type { SourceType, TaskCandidate, WorkReport } from '@/lib/types'
import {
  judgeExtractionClause,
  shouldCreateTaskCandidate,
  splitReportIntoClauses,
} from '@/lib/ai/clause-extraction-judge'
import type { ExtractionStatus } from '@/lib/ai/clause-extraction-judge'
import { normalizeTaskCandidateTitle } from '@/lib/ai/normalize-task-candidate-title'
import { generateCandidateKey } from '@/lib/ai/candidate-key'

type ReportLike = Pick<WorkReport, 'id' | 'submittedBy' | 'completed' | 'inProgress' | 'blockers' | 'nextActions'> & {
  candidateSource?: SourceType
  candidateReasonSourceLabel?: string
  candidateIdPrefix?: string
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeForDedup(text: string): string {
  return normalizeWhitespace(text).toLowerCase()
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

/**
 * 節の末尾にある述語部分（が必要です / します / です など）を除去し、
 * 理由文に自然に連結できるフレーズを返す。
 * 例: "API仕様の確認が必要です" → "API仕様の確認"
 */
function buildExcerpt(sentence: string, maxLength = 16): string {
  const compact = normalizeWhitespace(sentence)
  const stripped = compact
    .replace(/が必要(?:な事項|です?|な)?$/, '')
    .replace(/(?:します|しました|です|ます|でした|ました)$/, '')
    .trim()
  const text = stripped.length >= 2 ? stripped : compact
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

function buildReason(sentence: string, status: ExtractionStatus, sourceLabel?: string): string {
  if (sourceLabel) {
    const excerpt = normalizeWhitespace(sentence)
    const quoted = excerpt.length <= 32 ? excerpt : `${excerpt.slice(0, 31)}…`
    return `${sourceLabel}内の「${quoted}」から抽出`
  }

  const excerpt = buildExcerpt(sentence)
  if (status === 'waiting') {
    return `${excerpt}のため要フォロー`
  }
  return `${excerpt}が必要なため`
}

export function extractTaskCandidatesFromReports(reports: ReportLike[], projectId = ''): TaskCandidate[] {
  const candidates: TaskCandidate[] = []
  const seenTitles = new Set<string>()

  for (const report of reports) {
    const assignee = normalizeWhitespace(report.submittedBy)
    const candidateSource = report.candidateSource ?? 'report'
    const candidateIdPrefix = report.candidateIdPrefix ?? 'report'
    const reportText = [report.completed, report.inProgress, report.blockers, report.nextActions]
      .map((part) => part ?? '')
      .join('\n')
    const clauses = splitReportIntoClauses(reportText)
    let reportCandidateIndex = 0

    for (const clause of clauses) {
      const judgement = judgeExtractionClause(clause)
      if (!shouldCreateTaskCandidate(judgement)) continue

      const title = trimToTitle(clause)
      const normalizedTitle = normalizeForDedup(title)
      if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue
      seenTitles.add(normalizedTitle)

      const reason = buildReason(clause, judgement.status, report.candidateReasonSourceLabel)

      const displayTitle = normalizeTaskCandidateTitle(title)
      candidates.push({
        id: `${candidateIdPrefix}-${report.id}-${reportCandidateIndex}`,
        candidateKey: generateCandidateKey(projectId, title),
        title,
        displayTitle: displayTitle !== title ? displayTitle : undefined,
        reason,
        source: candidateSource,
        suggestedAssignee: assignee || undefined,
        suggestedDueDate: inferDueDate(clause),
        extractionStatus: judgement.status,
        extractionReasons: judgement.reasons,
        extractionConfidence: judgement.confidence,
      })
      reportCandidateIndex += 1
    }
  }

  console.info(
    '[extract-reports] extracted',
    candidates.length,
    'candidates:',
    candidates.map((c) => ({ id: c.id, title: c.title, extractionStatus: c.extractionStatus })),
  )
  return candidates
}
