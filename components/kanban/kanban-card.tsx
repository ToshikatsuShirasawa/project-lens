'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KanbanTask, TaskPriority } from '@/lib/types'

const priorityLabel: Record<TaskPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
}

interface KanbanCardProps {
  task: KanbanTask
  onEdit: (task: KanbanTask) => void
  onDragStart: (taskId: string, columnId: string) => void
  columnId: string
}

const aiOriginLabel = {
  slack: 'Slack由来',
  report: '報告由来',
  meeting: '議事録由来',
  ai: 'AI抽出',
}

export function KanbanCard({ task, onEdit, onDragStart, columnId }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id, columnId)}
      onClick={() => onEdit(task)}
      className="rounded-lg border border-border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all space-y-2 group"
    >
      <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
        {task.title}
      </p>
      {task.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {task.priority ? (
            <Badge
              variant="secondary"
              className={cn(
                'h-4 px-1.5 text-[9px] font-medium border-0 shrink-0',
                task.priority === 'HIGH' && 'bg-destructive/10 text-destructive',
                task.priority === 'MEDIUM' && 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
                task.priority === 'LOW' && 'text-muted-foreground'
              )}
            >
              {priorityLabel[task.priority]}
            </Badge>
          ) : null}
          {task.assignee && (
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[9px] bg-secondary">
                {task.assignee.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground truncate">
              <Calendar className="h-3 w-3 shrink-0" />
              {task.dueDate.length >= 10 ? task.dueDate.slice(0, 10) : task.dueDate}
            </span>
          )}
        </div>
        {task.aiOrigin && (
          <Badge className="text-[10px] h-4 px-1.5 border-0 bg-primary/10 text-primary gap-0.5">
            <Sparkles className="h-2.5 w-2.5" />
            {aiOriginLabel[task.aiOrigin]}
          </Badge>
        )}
      </div>
    </div>
  )
}
