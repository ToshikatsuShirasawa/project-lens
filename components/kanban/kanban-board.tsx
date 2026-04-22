'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { KanbanColumn } from './kanban-column'
import { TaskCandidateSidePanel } from './task-candidate-side-panel'
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
import { Filter, User, Sparkles } from 'lucide-react'
import { mockKanbanCandidates } from '@/lib/mock/kanban'
import {
  DEFAULT_KANBAN_TEMPLATE_KEY,
  getAllKanbanColumnKeysForEmptyBoard,
  getKanbanColumnSeedsForTemplate,
} from '@/lib/kanban/kanban-column-templates'
import { buildBoardFromApiTasks } from '@/lib/kanban/from-api'
import {
  KANBAN_COLUMNS_UPDATED_EVENT,
  type KanbanColumnsUpdatedDetail,
} from '@/lib/project-events'
import type {
  KanbanTask,
  KanbanTaskApiRecord,
  ProjectKanbanColumnApi,
  TaskCandidate,
  TaskPriority,
} from '@/lib/types'

type TaskFormPriority = 'none' | TaskPriority

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
  const [candidates, setCandidates] = useState<TaskCandidate[]>(mockKanbanCandidates)

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
    const onColumnsUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<KanbanColumnsUpdatedDetail>
      if (ce.detail?.projectId === projectId) {
        void loadTasks({ silent: true })
      }
    }
    window.addEventListener(KANBAN_COLUMNS_UPDATED_EVENT, onColumnsUpdated as EventListener)
    return () => window.removeEventListener(KANBAN_COLUMNS_UPDATED_EVENT, onColumnsUpdated as EventListener)
  }, [projectId, loadTasks])

  const [draggedCard, setDraggedCard] = useState<{ taskId: string; sourceColumn: string } | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null)
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

  const handleDragOver = (columnKey: string) => {
    setDropTargetColumn(columnKey)
  }

  const handleDrop = async (targetColumnKey: string) => {
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
    setCards({
      ...cards,
      [sourceColumn]: sourceCards.filter((c) => c.id !== taskId),
      [targetColumnKey]: [...(cards[targetColumnKey] ?? []), task],
    })
    setDraggedCard(null)
    setDropTargetColumn(null)

    try {
      const res = await fetch(`/api/kanban-tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, columnKey: targetColumnKey }),
      })
      if (!res.ok) {
        console.error('[kanban] PATCH failed', res.status, await res.text().catch(() => ''))
        await loadTasks({ silent: true })
        return
      }
      await loadTasks({ silent: true })
    } catch (e) {
      console.error('[kanban] PATCH', e)
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
        await loadTasks({ silent: true })
      } catch (e) {
        setEditError(e instanceof Error ? e.message : '保存に失敗しました')
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
        await loadTasks({ silent: true })
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : '保存に失敗しました')
      } finally {
        setAddSaving(false)
      }
      return
    }
  }

  const getFiltered = (columnKey: string) =>
    cards[columnKey]?.filter((t) => filterAssignee === 'all' || t.assignee?.name === filterAssignee) ?? []

  const allAssignees = Array.from(
    new Set(Object.values(cards).flat().map((t) => t.assignee?.name).filter(Boolean) as string[])
  )

  const backlogColumnKey =
    boardColumns.find((c) => c.key === 'backlog')?.key ?? boardColumns[0]?.key ?? 'backlog'

  const handleAddToKanban = (candidate: TaskCandidate) => {
    const task: KanbanTask = {
      id: `from-ai-${candidate.id}`,
      title: candidate.title,
      assignee: candidate.suggestedAssignee ? { name: candidate.suggestedAssignee } : undefined,
      dueDate: candidate.suggestedDueDate,
      aiOrigin: candidate.source,
    }
    setCards({ ...cards, [backlogColumnKey]: [...(cards[backlogColumnKey] ?? []), task] })
    setCandidates(candidates.filter((c) => c.id !== candidate.id))
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
            {candidates.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3" />
                候補: {candidates.length}件
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-6 bg-muted/20">
          <div className="flex gap-5 h-full">
            {boardColumns.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.key}
                title={col.name}
                tasks={getFiltered(col.key)}
                onAddCard={() => handleAddCard(col.key)}
                onEditCard={handleEditCard}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={(colKey) => void handleDrop(colKey)}
                isDropTarget={dropTargetColumn === col.key}
              />
            ))}
          </div>
        </div>
      </div>

      <TaskCandidateSidePanel
        candidates={candidates}
        onAddToKanban={handleAddToKanban}
        onHold={(id) => {}}
        onDismiss={(id) => setCandidates(candidates.filter((c) => c.id !== id))}
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
              {editingTask ? (editSaving ? '保存中…' : '保存') : addSaving ? '追加中…' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
