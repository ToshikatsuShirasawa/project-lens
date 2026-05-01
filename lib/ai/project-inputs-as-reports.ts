import type { ProjectInputApiRecord, SourceType, WorkReport } from '@/lib/types'

function sourceFromInputType(inputType: ProjectInputApiRecord['inputType']): SourceType {
  if (inputType === 'SLACK') return 'slack'
  return 'meeting'
}

function reasonLabelFromInputType(inputType: ProjectInputApiRecord['inputType']): string {
  if (inputType === 'SLACK') return 'Slackメモ'
  return '議事録'
}

export function projectInputToWorkReport(input: ProjectInputApiRecord, index: number, projectId: string): WorkReport {
  const submittedBy = input.submittedBy.trim() || '不明'
  const title = input.title?.trim()
  const sourceLabel = input.sourceLabel?.trim()
  const header = [title, sourceLabel].filter(Boolean).join('\n')

  return {
    id: input.id || `input-${projectId}-${index}`,
    completed: '',
    inProgress: '',
    blockers: '',
    nextActions: header ? `${header}\n${input.body}` : input.body,
    submittedAt: input.createdAt || new Date().toISOString(),
    submittedBy,
    candidateSource: sourceFromInputType(input.inputType),
    candidateReasonSourceLabel: reasonLabelFromInputType(input.inputType),
    candidateIdPrefix: 'input',
  }
}
