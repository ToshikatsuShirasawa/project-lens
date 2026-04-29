'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { TaskCandidatesCard } from '@/components/dashboard/task-candidates-card'
import { extractTaskCandidatesFromReports } from '@/lib/ai/extract-task-candidates-from-reports'
import { mergeTaskCandidates } from '@/lib/ai/merge-task-candidates'
import { sortTaskCandidatesForDisplay } from '@/lib/ai/sort-task-candidates'
import { mockKanbanCandidates } from '@/lib/mock/kanban'
import { canUseMockCandidates } from '@/lib/mock/can-use-mock-candidates'
import { toastError, toastSuccess } from '@/lib/operation-toast'
import type { TaskCandidate, WorkReport } from '@/lib/types'

// v0 TaskCandidatesCard のソース型は "ai" を持たないため変換が必要
type CardAISource = 'slack' | 'report' | 'meeting'

function toCardSource(source: string): CardAISource {
  if (source === 'slack' || source === 'meeting') return source
  return 'report'
}

function toWorkReport(raw: unknown, index: number, projectId: string): WorkReport | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const submittedByUser =
    r.submittedBy && typeof r.submittedBy === 'object'
      ? (r.submittedBy as Record<string, unknown>)
      : null

  const submittedByName =
    (typeof r.submittedBy === 'string' && r.submittedBy.trim()) ||
    (typeof r.authorName === 'string' && r.authorName.trim()) ||
    (typeof r.userName === 'string' && r.userName.trim()) ||
    (typeof submittedByUser?.name === 'string' && submittedByUser.name.trim()) ||
    (typeof submittedByUser?.email === 'string' && submittedByUser.email.trim()) ||
    '不明'

  return {
    id: typeof r.id === 'string' && r.id.trim() ? r.id : `report-${projectId}-${index}`,
    completed: typeof r.completed === 'string' ? r.completed : '',
    inProgress: typeof r.inProgress === 'string' ? r.inProgress : '',
    blockers: typeof r.blockers === 'string' ? r.blockers : '',
    nextActions: typeof r.nextActions === 'string' ? r.nextActions : '',
    submittedAt:
      (typeof r.submittedAt === 'string' && r.submittedAt) ||
      (typeof r.createdAt === 'string' && r.createdAt) ||
      new Date().toISOString(),
    submittedBy: submittedByName,
  }
}

interface DashboardTaskCandidatesCardProps {
  projectId: string
}

export function DashboardTaskCandidatesCard({ projectId }: DashboardTaskCandidatesCardProps) {
  const [rawCandidates, setRawCandidates] = useState<TaskCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [backlogColumnKey, setBacklogColumnKey] = useState('backlog')

  // レポートからAI候補を抽出（カンバンと同じロジック）
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reports`)
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const list = Array.isArray(body)
          ? body
          : body &&
              typeof body === 'object' &&
              'reports' in body &&
              Array.isArray((body as { reports: unknown }).reports)
            ? ((body as { reports: unknown[] }).reports ?? [])
            : []

        const reports = list
          .map((item, idx) => toWorkReport(item, idx, projectId))
          .filter((item): item is WorkReport => Boolean(item))
          .filter(
            (item) =>
              item.completed.trim() ||
              item.inProgress.trim() ||
              item.blockers.trim() ||
              item.nextActions.trim()
          )

        const extracted = extractTaskCandidatesFromReports(reports)
        if (cancelled) return

        if (extracted.length > 0) {
          setRawCandidates(sortTaskCandidatesForDisplay(mergeTaskCandidates(extracted)))
        } else if (canUseMockCandidates) {
          setRawCandidates(
            mockKanbanCandidates.map((c) => ({ ...c, extractionStatus: 'unknown' as const }))
          )
        }
      } catch {
        if (!cancelled && canUseMockCandidates) {
          setRawCandidates(
            mockKanbanCandidates.map((c) => ({ ...c, extractionStatus: 'unknown' as const }))
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // バックログ列キーを取得
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/kanban-tasks?projectId=${encodeURIComponent(projectId)}`)
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok || !body || typeof body !== 'object') return
        const parsed = body as { columns?: { key: string; sortOrder: number }[] }
        const cols = parsed.columns ?? []
        const sorted = [...cols].sort((a, b) => a.sortOrder - b.sortOrder)
        const backlog = sorted.find((c) => c.key === 'backlog') ?? sorted[0]
        if (!cancelled && backlog) setBacklogColumnKey(backlog.key)
      } catch {
        // デフォルト 'backlog' を維持
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const mappedCandidates = rawCandidates.map((c) => ({
    id: c.id,
    title: c.displayTitle ?? c.title,
    reason: c.reason,
    source: toCardSource(c.source),
    suggestedAssignee: c.suggestedAssignee,
    suggestedDueDate: c.suggestedDueDate,
  }))

  const handleAddToKanban = (id: string) => {
    const candidate = rawCandidates.find((c) => c.id === id)
    if (!candidate) return

    const title = candidate.displayTitle ?? candidate.title
    const createBody: Record<string, unknown> = { projectId, title, columnKey: backlogColumnKey }

    const descParts: string[] = []
    if (candidate.reason?.trim()) descParts.push(candidate.reason.trim())
    if (candidate.extractionReasons?.length) {
      descParts.push(`理由: ${candidate.extractionReasons.join(', ')}`)
    }
    const desc = descParts.join('\n')
    if (desc) createBody.description = desc

    const dueDate =
      candidate.suggestedDueDate && /^\d{4}-\d{2}-\d{2}/.test(candidate.suggestedDueDate)
        ? candidate.suggestedDueDate.slice(0, 10)
        : null
    if (dueDate) createBody.dueDate = dueDate

    void fetch('/api/kanban-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null)
          const msg =
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
              ? (body as { message: string }).message
              : `HTTP ${res.status}`
          toastError(msg)
          return
        }
        toastSuccess('AI候補をバックログに追加しました')
      })
      .catch((e) => {
        toastError(e instanceof Error ? e.message : undefined)
      })
  }

  const handleHold = (_id: string) => {
    toastSuccess('候補をあとで確認に回しました')
  }

  const handleDismiss = (_id: string) => {
    toastSuccess('候補を却下しました')
  }

  if (loading) {
    return (
      <Card className="bg-card shadow-sm border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <TaskCandidatesCard
      candidates={mappedCandidates}
      onAddToKanban={handleAddToKanban}
      onHold={handleHold}
      onDismiss={handleDismiss}
    />
  )
}
