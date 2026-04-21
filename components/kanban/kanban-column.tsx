'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KanbanCard } from './kanban-card'
import type { KanbanTask } from '@/lib/types'

interface KanbanColumnProps {
  id: string
  title: string
  tasks: KanbanTask[]
  onAddCard: () => void
  onEditCard: (task: KanbanTask) => void
  onDragStart: (taskId: string, columnId: string) => void
  onDragOver: (columnId: string) => void
  onDrop: (columnId: string) => void
  isDropTarget: boolean
}

const columnColors: Record<string, string> = {
  backlog: 'bg-slate-100 text-slate-600',
  inprogress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  review: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
}

export function KanbanColumn({
  id,
  title,
  tasks,
  onAddCard,
  onEditCard,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors',
        isDropTarget ? 'border-primary/50 bg-primary/5' : 'border-border'
      )}
      onDragOver={(e) => { e.preventDefault(); onDragOver(id) }}
      onDrop={() => onDrop(id)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge className={cn('text-[10px] h-5 px-1.5 border-0', columnColors[id] ?? 'bg-muted text-muted-foreground')}>
            {tasks.length}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onAddCard}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-3 flex-1 min-h-[120px]">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            columnId={id}
            onEdit={onEditCard}
            onDragStart={onDragStart}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground py-4">
            タスクなし
          </div>
        )}
      </div>
    </div>
  )
}
