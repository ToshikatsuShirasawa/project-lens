'use client'

import { useState } from 'react'
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
import { Filter, User, Sparkles } from 'lucide-react'
import { mockKanbanCards, mockKanbanCandidates, KANBAN_COLUMNS } from '@/lib/mock/kanban'
import type { KanbanTask, TaskCandidate } from '@/lib/types'

export function KanbanBoard() {
  const [cards, setCards] = useState<Record<string, KanbanTask[]>>(mockKanbanCards)
  const [candidates, setCandidates] = useState<TaskCandidate[]>(mockKanbanCandidates)
  const [draggedCard, setDraggedCard] = useState<{ taskId: string; sourceColumn: string } | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null)
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '' })

  const handleDragStart = (taskId: string, columnId: string) => {
    setDraggedCard({ taskId, sourceColumn: columnId })
  }

  const handleDragOver = (columnId: string) => {
    setDropTargetColumn(columnId)
  }

  const handleDrop = (targetColumn: string) => {
    if (!draggedCard) return
    const { taskId, sourceColumn } = draggedCard
    if (sourceColumn === targetColumn) {
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
      [targetColumn]: [...cards[targetColumn], task],
    })
    setDraggedCard(null)
    setDropTargetColumn(null)
  }

  const handleAddCard = (columnId: string) => {
    setNewCardColumn(columnId)
    setEditingTask(null)
    setForm({ title: '', description: '' })
    setIsDialogOpen(true)
  }

  const handleEditCard = (task: KanbanTask) => {
    setEditingTask(task)
    setForm({ title: task.title, description: task.description || '' })
    setNewCardColumn(null)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (editingTask) {
      const updated = { ...cards }
      for (const col of Object.keys(updated)) {
        updated[col] = updated[col].map((t) =>
          t.id === editingTask.id ? { ...t, title: form.title, description: form.description } : t
        )
      }
      setCards(updated)
    } else if (newCardColumn) {
      const task: KanbanTask = { id: `t-${Date.now()}`, title: form.title, description: form.description }
      setCards({ ...cards, [newCardColumn]: [...cards[newCardColumn], task] })
    }
    setIsDialogOpen(false)
  }

  const getFiltered = (columnId: string) =>
    cards[columnId]?.filter((t) => filterAssignee === 'all' || t.assignee?.name === filterAssignee) ?? []

  const allAssignees = Array.from(
    new Set(Object.values(cards).flat().map((t) => t.assignee?.name).filter(Boolean) as string[])
  )

  const handleAddToKanban = (candidate: TaskCandidate) => {
    const task: KanbanTask = {
      id: `from-ai-${candidate.id}`,
      title: candidate.title,
      assignee: candidate.suggestedAssignee ? { name: candidate.suggestedAssignee } : undefined,
      dueDate: candidate.suggestedDueDate,
      aiOrigin: candidate.source,
    }
    setCards({ ...cards, backlog: [...cards.backlog, task] })
    setCandidates(candidates.filter((c) => c.id !== candidate.id))
  }

  const totalTasks = Object.values(cards).flat().length

  return (
    <div className="flex h-full">
      {/* Main Kanban Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Filters */}
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
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              確定タスク: {totalTasks}件
            </Badge>
            {candidates.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3" />
                候補: {candidates.length}件
              </Badge>
            )}
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto p-6 bg-muted/20">
          <div className="flex gap-5 h-full">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={getFiltered(col.id)}
                onAddCard={() => handleAddCard(col.id)}
                onEditCard={handleEditCard}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDropTarget={dropTargetColumn === col.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AI Candidates Panel */}
      <TaskCandidateSidePanel
        candidates={candidates}
        onAddToKanban={handleAddToKanban}
        onHold={(id) => {}}
        onDismiss={(id) => setCandidates(candidates.filter((c) => c.id !== id))}
      />

      {/* Card Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'カードを編集' : '新しいカードを追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="タスクのタイトル"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">説明</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="タスクの詳細説明"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={!form.title}>
              {editingTask ? '保存' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
