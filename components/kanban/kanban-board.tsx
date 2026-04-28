'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { KanbanColumn } from './kanban-column'
import { TaskCandidateSidePanel } from './task-candidate-side-panel'
import type { CandidateApprovalOverrides } from './task-candidate-side-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Filter, Loader2, User, Sparkles } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/operation-toast'
import { mockKanbanCandidates } from '@/lib/mock/kanban'
import {
  DEFAULT_KANBAN_TEMPLATE_KEY,
  getAllKanbanColumnKeysForEmptyBoard,
  getKanbanColumnSeedsForTemplate,
} from '@/lib/kanban/kanban-column-templates'
import { buildBoardFromApiTasks } from '@/lib/kanban/from-api'
import {
  buildAiTaskCandidateEventPayload,
  logAiTaskCandidateEvent,
} from '@/lib/ai/log-candidate-event'
import { extractTaskCandidatesFromReports } from '@/lib/ai/extract-task-candidates-from-reports'
import { buildTaskCandidateKey, mergeTaskCandidates } from '@/lib/ai/merge-task-candidates'
import { sortTaskCandidatesForDisplay } from '@/lib/ai/sort-task-candidates'
import { buildComparativeRecommendationReason, sortTaskCandidatesByScore } from '@/lib/ai/task-candidate-score'
import {
  KANBAN_COLUMNS_UPDATED_EVENT,
  type KanbanColumnsUpdatedDetail,
} from '@/lib/project-events'
import type {
  KanbanTask,
  KanbanTaskApiRecord,
  ProjectKanbanColumnApi,
  ProjectMemberApiRecord,
  TaskCandidate,
  TaskPriority,
  WorkReport,
} from '@/lib/types'

type TaskFormPriority = 'none' | TaskPriority

const ASSIGNEE_NONE_VALUE = '__none__'

function memberOptionLabel(m: ProjectMemberApiRecord): string {
  const n = m.name?.trim()
  if (n) return n
  return m.email.split('@')[0] ?? m.email
}

function displayAssigneeLabel(task: KanbanTask): string | undefined {
  if (!task.assignee) return undefined
  const n = task.assignee.name?.trim()
  if (n) return n
  const e = task.assignee.email?.trim()
  if (e) {
    const local = e.split('@')[0]
    return (local || e).trim() || undefined
  }
  return undefined
}

function toDateInputValue(s: string | undefined): string {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

const emptyTaskForm = () => ({
  title: '',
  description: '',
  dueDate: '',
  priority: 'none' as TaskFormPriority,
  assigneeUserId: '',
})

interface KanbanBoardProps {
  projectId: string
}

function placeholderBoardColumns(): ProjectKanbanColumnApi[] {
  return getKanbanColumnSeedsForTemplate(DEFAULT_KANBAN_TEMPLATE_KEY).map((c) => ({
    id: `placeholder-${c.key}`,
    key: c.key,
    name: c.name,
    sortOrder: c.sortOrder,
    isArchived: false,
  }))
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const stableColumnKeys = useMemo(() => [...getAllKanbanColumnKeysForEmptyBoard()], [])
  const emptyCards = useMemo(
    () =>
      Object.fromEntries(stableColumnKeys.map((k) => [k, [] as KanbanTask[]])) as Record<string, KanbanTask[]>,
    [stableColumnKeys]
  )

  const [boardColumns, setBoardColumns] = useState<ProjectKanbanColumnApi[]>(placeholderBoardColumns)
  const [cards, setCards] = useState<Record<string, KanbanTask[]>>(emptyCards)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<TaskCandidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [addedCandidateIds, setAddedCandidateIds] = useState<Set<string>>(new Set())
  const [projectMembers, setProjectMembers] = useState<ProjectMemberApiRecord[]>([])
  const [reportsFetchKey, setReportsFetchKey] = useState(0)

  const orderedAiCandidates = useMemo(() => sortTaskCandidatesByScore(candidates), [candidates])
  const topRecommendation = useMemo(
    () => buildComparativeRecommendationReason(orderedAiCandidates),
    [orderedAiCandidates]
  )

  const loadTasks = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false
      if (!silent) {
        setTasksLoading(true)
        setTasksError(null)
      }
      try {
        const res = await fetch(`/api/kanban-tasks?projectId=${encodeURIComponent(projectId)}`)
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const msg =
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
              ? (body as { message: string }).message
              : `HTTP ${res.status}`
          throw new Error(msg)
        }
        const parsed = body && typeof body === 'object' ? body : null
        const rawColumns =
          parsed && 'columns' in parsed && Array.isArray((parsed as { columns: unknown }).columns)
            ? (parsed as { columns: ProjectKanbanColumnApi[] }).columns
            : []
        const tasks =
          parsed && 'tasks' in parsed && Array.isArray((parsed as { tasks: unknown }).tasks)
            ? (parsed as { tasks: KanbanTaskApiRecord[] }).tasks
            : []

        const columns = [...rawColumns].sort((a, b) => a.sortOrder - b.sortOrder)
        if (columns.length > 0) {
          setBoardColumns(columns)
          setCards(buildBoardFromApiTasks(columns, tasks))
        } else {
          setBoardColumns(placeholderBoardColumns())
          setCards(buildBoardFromApiTasks(placeholderBoardColumns(), tasks))
        }
        setTasksError(null)
      } catch (e) {
        setTasksError(e instanceof Error ? e.message : 'タスクの読み込みに失敗しました')
        if (!silent) {
          setCards(emptyCards)
        }
      } finally {
        if (!silent) setTasksLoading(false)
      }
    },
    [projectId, emptyCards]
  )

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    let cancelled = false

    const toWorkReport = (raw: unknown, index: number): WorkReport | null => {
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

    void (async () => {
      const endpoint = `/api/projects/${encodeURIComponent(projectId)}/reports`
      try {
        const res = await fetch(endpoint)
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const list = Array.isArray(body)
          ? body
          : body && typeof body === 'object' && 'reports' in body && Array.isArray((body as { reports: unknown }).reports)
            ? ((body as { reports: unknown[] }).reports ?? [])
            : []

        const reports = list
          .map((item, index) => toWorkReport(item, index))
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
          setCandidates(sortTaskCandidatesForDisplay(mergeTaskCandidates(extracted)))
          return
        }

        console.info(
          '[kanban] reports から候補を生成できなかったため demo 候補を利用します',
          'reports件数:', reports.length,
          'reports抜粋:', reports.map((r) => ({
            id: r.id,
            completed: r.completed?.slice(0, 40),
            inProgress: r.inProgress?.slice(0, 40),
            nextActions: r.nextActions?.slice(0, 40),
          })),
        )
        setCandidates(mockKanbanCandidates.map((c) => ({ ...c, extractionStatus: 'unknown' as const })))
      } catch (error) {
        if (cancelled) return
        console.warn('[kanban] reports の取得に失敗したため demo 候補へフォールバックします', error)
        setCandidates(mockKanbanCandidates.map((c) => ({ ...c, extractionStatus: 'unknown' as const })))
      } finally {
        if (!cancelled) setCandidatesLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [projectId, reportsFetchKey])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string }>).detail
      if (!detail?.projectId || detail.projectId === projectId) {
        setReportsFetchKey((k) => k + 1)
      }
    }
    window.addEventListener('projectlens:reports-updated', handler)
    return () => window.removeEventListener('projectlens:reports-updated', handler)
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/members`)
        const body: unknown = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setProjectMembers([])
          return
        }
        const parsed = body && typeof body === 'object' ? body : null
        const list =
          parsed && 'members' in parsed && Array.isArray((parsed as { members: unknown }).members)
            ? (parsed as { members: ProjectMemberApiRecord[] }).members
            : []
        setProjectMembers(list)
      } catch {
        if (!cancelled) setProjectMembers([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    const onColumnsUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<KanbanColumnsUpdatedDetail>
      if (ce.detail?.projectId === projectId) {
        void loadTasks({ silent: true })
      }
    }
    window.addEventListener(KANBAN_COLUMNS_UPDATED_EVENT, onColumnsUpdated as EventListener)
    return () => window.removeEventListener(KANBAN_COLUMNS_UPDATED_EVENT, onColumnsUpdated as EventListener)
  }, [projectId, loadTasks])

  useEffect(() => {
    if (tasksLoading || candidates.length === 0) return
    const allTasks = Object.values(cards).flat()
    if (allTasks.length === 0) return
    const taskTitleKeys = new Set(allTasks.map((t) => buildTaskCandidateKey(t.title)))
    const matchedIds: string[] = []
    for (const candidate of candidates) {
      const candidateKey = buildTaskCandidateKey(candidate.displayTitle ?? candidate.title)
      if (taskTitleKeys.has(candidateKey)) {
        matchedIds.push(candidate.id)
      }
    }
    if (matchedIds.length === 0) return
    setAddedCandidateIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of matchedIds) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tasksLoading, cards, candidates])

  const [draggedCard, setDraggedCard] = useState<{ taskId: string; sourceColumn: string } | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null)
  const [recentDrop, setRecentDrop] = useState<{ columnKey: string; taskId: string } | null>(null)
  const [recentAiAdd, setRecentAiAdd] = useState<{ columnKey: string; taskId: string } | null>(null)
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null)
  const [form, setForm] = useState(emptyTaskForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const handleDragStart = (taskId: string, columnKey: string) => {
    setDraggedCard({ taskId, sourceColumn: columnKey })
  }

  const handleDragEnd = () => {
    setDraggedCard(null)
    setDropTargetColumn(null)
  }

  const handleDragOver = (columnKey: string, _insertIndex: number) => {
    setDropTargetColumn(columnKey)
  }

  useEffect(() => {
    if (!recentDrop) return
    const t = window.setTimeout(() => setRecentDrop(null), 280)
    return () => window.clearTimeout(t)
  }, [recentDrop])

  useEffect(() => {
    if (!recentAiAdd) return
    const t = window.setTimeout(() => setRecentAiAdd(null), 800)
    return () => window.clearTimeout(t)
  }, [recentAiAdd])

  const handleDrop = async (targetColumnKey: string, insertIndex?: number) => {
    if (!draggedCard) return
    const { taskId, sourceColumn } = draggedCard
    if (sourceColumn === targetColumnKey) {
      setDraggedCard(null)
      setDropTargetColumn(null)
      return
    }
    const sourceCards = cards[sourceColumn]
    const task = sourceCards.find((c) => c.id === taskId)
    if (!task) return
    const nextTargetCards = [...(cards[targetColumnKey] ?? [])]
    const safeInsertIndex =
      typeof insertIndex === 'number' && Number.isFinite(insertIndex)
        ? Math.max(0, Math.min(insertIndex, nextTargetCards.length))
        : nextTargetCards.length
    nextTargetCards.splice(safeInsertIndex, 0, task)

    setCards({
      ...cards,
      [sourceColumn]: sourceCards.filter((c) => c.id !== taskId),
      [targetColumnKey]: nextTargetCards,
    })
    setRecentDrop({ columnKey: targetColumnKey, taskId })
    setDraggedCard(null)
    setDropTargetColumn(null)

    try {
      const res = await fetch(`/api/kanban-tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, columnKey: targetColumnKey }),
      })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        console.error('[kanban] PATCH failed', res.status, msg)
        toastError(msg)
        await loadTasks({ silent: true })
        return
      }
      toastSuccess('タスクを移動しました')
      await loadTasks({ silent: true })
    } catch (e) {
      console.error('[kanban] PATCH', e)
      toastError(e instanceof Error ? e.message : undefined)
      await loadTasks({ silent: true })
    }
  }

  const handleAddCard = (columnKey: string) => {
    setCreateError(null)
    setNewCardColumn(columnKey)
    setEditingTask(null)
    setForm(emptyTaskForm())
    setIsDialogOpen(true)
  }

  const handleEditCard = (task: KanbanTask) => {
    setCreateError(null)
    setEditError(null)
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      dueDate: toDateInputValue(task.dueDate),
      priority: task.priority ?? 'none',
      assigneeUserId: task.assigneeUserId ?? task.assignee?.id ?? '',
    })
    setNewCardColumn(null)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (editingTask) {
      const titleTrim = form.title.trim()
      if (!titleTrim || editSaving) return

      setEditError(null)
      setEditSaving(true)
      try {
        const res = await fetch(`/api/kanban-tasks/${encodeURIComponent(editingTask.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            title: titleTrim,
            description: form.description.trim() || null,
            dueDate: form.dueDate.trim() ? form.dueDate.trim() : null,
            priority: form.priority === 'none' ? null : form.priority,
            assigneeId: form.assigneeUserId.trim() ? form.assigneeUserId.trim() : null,
          }),
        })
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const msg =
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
              ? (body as { message: string }).message
              : `HTTP ${res.status}`
          throw new Error(msg)
        }
        setIsDialogOpen(false)
        setEditingTask(null)
        setForm(emptyTaskForm())
        toastSuccess('保存しました')
        await loadTasks({ silent: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : '保存に失敗しました'
        console.error('[kanban] task save', e)
        setEditError(msg)
        toastError(msg)
      } finally {
        setEditSaving(false)
      }
      return
    }
    if (newCardColumn) {
      setCreateError(null)
      setAddSaving(true)
      try {
        const createBody: Record<string, unknown> = {
          projectId,
          title: form.title.trim(),
          columnKey: newCardColumn,
        }
        const desc = form.description.trim()
        if (desc) createBody.description = desc
        if (form.dueDate.trim()) createBody.dueDate = form.dueDate.trim()
        if (form.priority !== 'none') createBody.priority = form.priority
        if (form.assigneeUserId.trim()) createBody.assigneeId = form.assigneeUserId.trim()
        const res = await fetch('/api/kanban-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createBody),
        })
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const msg =
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
              ? (body as { message: string }).message
              : `HTTP ${res.status}`
          throw new Error(msg)
        }
        setIsDialogOpen(false)
        setNewCardColumn(null)
        setForm(emptyTaskForm())
        toastSuccess('タスクを追加しました')
        await loadTasks({ silent: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : '保存に失敗しました'
        console.error('[kanban] task create', e)
        setCreateError(msg)
        toastError(msg)
      } finally {
        setAddSaving(false)
      }
      return
    }
  }

  const getFiltered = (columnKey: string) =>
    cards[columnKey]?.filter(
      (t) => filterAssignee === 'all' || displayAssigneeLabel(t) === filterAssignee
    ) ?? []

  const allAssignees = Array.from(
    new Set(
      Object.values(cards)
        .flat()
        .map((t) => displayAssigneeLabel(t))
        .filter((x): x is string => Boolean(x))
    )
  )

  const backlogColumnKey =
    boardColumns.find((c) => c.key === 'backlog')?.key ?? boardColumns[0]?.key ?? 'backlog'
  const backlogColumnName =
    boardColumns.find((c) => c.key === backlogColumnKey)?.name ?? 'バックログ'
  const pendingCandidateCount = candidates.filter((c) => !addedCandidateIds.has(c.id)).length

  const handleAddToKanban = async (candidate: TaskCandidate, overrides?: CandidateApprovalOverrides): Promise<void> => {
    const isTopCandidate = orderedAiCandidates[0]?.id === candidate.id
    const clientTaskId = `from-ai-${candidate.id}`
    logAiTaskCandidateEvent(
      buildAiTaskCandidateEventPayload(projectId, candidate, 'accepted', {
        isTopCandidate,
        createdTaskId: clientTaskId,
        metadata: { approvalTitle: overrides?.title?.trim() || undefined },
        recommendationReasonOverride: isTopCandidate ? topRecommendation.recommendationReason : undefined,
        scoreDiffToNext: isTopCandidate ? topRecommendation.scoreDiffToNext : undefined,
        isComparativeRecommendation: isTopCandidate ? topRecommendation.isComparativeRecommendation : undefined,
      })
    )

    const title = overrides?.title?.trim() || candidate.displayTitle || candidate.title
    const selectedAssigneeUserId = overrides?.suggestedAssigneeUserId?.trim()
    const suggestedDueDate = overrides?.suggestedDueDate?.trim() || candidate.suggestedDueDate

    const createBody: Record<string, unknown> = {
      projectId,
      title,
      columnKey: backlogColumnKey,
    }

    const descParts: string[] = []
    if (candidate.reason?.trim()) descParts.push(candidate.reason.trim())
    if (candidate.extractionReasons && candidate.extractionReasons.length > 0) {
      descParts.push(`理由: ${candidate.extractionReasons.join(', ')}`)
    }
    const desc = descParts.join('\n')
    if (desc) createBody.description = desc

    const dueDateFormatted =
      suggestedDueDate && /^\d{4}-\d{2}-\d{2}/.test(suggestedDueDate)
        ? suggestedDueDate.slice(0, 10)
        : null
    if (dueDateFormatted) createBody.dueDate = dueDateFormatted

    if (selectedAssigneeUserId) createBody.assigneeId = selectedAssigneeUserId

    const res = await fetch('/api/kanban-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    })
    const resBody: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      const msg =
        resBody &&
        typeof resBody === 'object' &&
        'message' in resBody &&
        typeof (resBody as { message: unknown }).message === 'string'
          ? (resBody as { message: string }).message
          : `HTTP ${res.status}`
      console.error('[kanban] AI candidate add failed', msg)
      toastError(msg)
      throw new Error(msg)
    }

    const newTaskId =
      resBody && typeof resBody === 'object' &&
      'id' in resBody && typeof (resBody as { id: unknown }).id === 'string'
        ? (resBody as { id: string }).id
        : resBody && typeof resBody === 'object' &&
          'task' in resBody && resBody.task && typeof resBody.task === 'object' &&
          'id' in (resBody.task as object) && typeof (resBody.task as { id: unknown }).id === 'string'
          ? (resBody.task as { id: string }).id
          : null

    await loadTasks({ silent: true })
    setAddedCandidateIds((prev) => new Set([...prev, candidate.id]))
    toastSuccess('AI候補をバックログに追加しました')
    if (newTaskId) {
      setRecentAiAdd({ columnKey: backlogColumnKey, taskId: newTaskId })
    }
  }

  const totalTasks = Object.values(cards).flat().length

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40">
              <User className="mr-2 h-4 w-4" />
              <SelectValue placeholder="担当者" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての担当者</SelectItem>
              {allAssignees.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-3">
            {tasksError && (
              <span className="text-xs text-destructive max-w-[220px] truncate" title={tasksError}>
                {tasksError}
              </span>
            )}
            <Badge variant="secondary" className="text-xs">
              {tasksLoading ? 'タスク読み込み中…' : `確定タスク: ${totalTasks}件`}
            </Badge>
            {pendingCandidateCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3" />
                候補: {pendingCandidateCount}件
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-4 bg-muted/20">
          <div className="flex gap-4 h-full">
            {boardColumns.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.key}
                title={col.name}
                tasks={getFiltered(col.key)}
                onAddCard={() => handleAddCard(col.key)}
                onEditCard={handleEditCard}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(colKey, idx) => void handleDrop(colKey, idx)}
                isDropTarget={dropTargetColumn === col.key}
                draggedTaskId={draggedCard?.taskId ?? null}
                justDropped={recentDrop?.columnKey === col.key}
                justDroppedTaskId={recentDrop?.columnKey === col.key ? recentDrop.taskId : null}
                tasksLoading={tasksLoading}
                justAiAdded={Boolean(recentAiAdd && recentAiAdd.columnKey === col.key)}
                justAiAddedTaskId={recentAiAdd && recentAiAdd.columnKey === col.key ? recentAiAdd.taskId : null}
              />
            ))}
          </div>
        </div>
      </div>

      <TaskCandidateSidePanel
        projectId={projectId}
        candidates={orderedAiCandidates}
        candidatesLoading={candidatesLoading}
        projectMembers={projectMembers}
        addedCandidateIds={addedCandidateIds}
        backlogColumnName={backlogColumnName}
        onAddToKanban={handleAddToKanban}
        onHold={(id) => {
          const target = candidates.find((c) => c.id === id)
          if (target) {
            logAiTaskCandidateEvent(
              buildAiTaskCandidateEventPayload(projectId, target, 'snoozed', {
                isTopCandidate: orderedAiCandidates[0]?.id === target.id,
                recommendationReasonOverride:
                  orderedAiCandidates[0]?.id === target.id ? topRecommendation.recommendationReason : undefined,
                scoreDiffToNext:
                  orderedAiCandidates[0]?.id === target.id ? topRecommendation.scoreDiffToNext : undefined,
                isComparativeRecommendation:
                  orderedAiCandidates[0]?.id === target.id ? topRecommendation.isComparativeRecommendation : undefined,
              })
            )
          }
          setCandidates((prev) => {
            const idx = prev.findIndex((c) => c.id === id)
            if (idx < 0) return prev
            const t = { ...prev[idx], held: true }
            const others = prev.filter((c) => c.id !== id)
            return [...others, t]
          })
          toastSuccess('候補をあとで確認に回しました')
        }}
        onDismiss={(id) => {
          const target = candidates.find((c) => c.id === id)
          if (target) {
            logAiTaskCandidateEvent(
              buildAiTaskCandidateEventPayload(projectId, target, 'dismissed', {
                isTopCandidate: orderedAiCandidates[0]?.id === target.id,
                recommendationReasonOverride:
                  orderedAiCandidates[0]?.id === target.id ? topRecommendation.recommendationReason : undefined,
                scoreDiffToNext:
                  orderedAiCandidates[0]?.id === target.id ? topRecommendation.scoreDiffToNext : undefined,
                isComparativeRecommendation:
                  orderedAiCandidates[0]?.id === target.id ? topRecommendation.isComparativeRecommendation : undefined,
              })
            )
          }
          const existed = candidates.some((c) => c.id === id)
          setCandidates((prev) => prev.filter((c) => c.id !== id))
          if (existed) toastSuccess('候補を却下しました')
        }}
      />

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setCreateError(null)
            setEditError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'タスクの詳細' : '新しいカードを追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kanban-dialog-title">タイトル</Label>
              <Input
                id="kanban-dialog-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="タスクのタイトル"
                disabled={addSaving || editSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kanban-dialog-desc">説明</Label>
              <Textarea
                id="kanban-dialog-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="タスクの詳細説明"
                rows={3}
                disabled={addSaving || editSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kanban-dialog-due">期限</Label>
              <Input
                id="kanban-dialog-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                disabled={addSaving || editSaving}
                className="w-full max-w-[12rem]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kanban-dialog-priority">優先度</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as TaskFormPriority })
                }
                disabled={addSaving || editSaving}
              >
                <SelectTrigger id="kanban-dialog-priority" className="w-full max-w-[12rem]">
                  <SelectValue placeholder="未設定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未設定</SelectItem>
                  <SelectItem value="LOW">低</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="HIGH">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kanban-dialog-assignee">担当者</Label>
              <Select
                value={form.assigneeUserId.trim() ? form.assigneeUserId.trim() : ASSIGNEE_NONE_VALUE}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    assigneeUserId: v === ASSIGNEE_NONE_VALUE ? '' : v,
                  })
                }
                disabled={addSaving || editSaving}
              >
                <SelectTrigger id="kanban-dialog-assignee" className="w-full max-w-[20rem]">
                  <SelectValue placeholder="未設定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ASSIGNEE_NONE_VALUE}>未設定</SelectItem>
                  {projectMembers.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {memberOptionLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {createError && !editingTask && (
            <p className="text-sm text-destructive" role="alert">
              {createError}
            </p>
          )}
          {editingTask && editError && (
            <p className="text-sm text-destructive" role="alert">
              {editError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={addSaving || editSaving}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!form.title.trim() || addSaving || editSaving}
            >
              {editSaving || addSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {editingTask ? '保存中…' : '追加中…'}
                </>
              ) : editingTask ? (
                '保存'
              ) : (
                '追加'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
