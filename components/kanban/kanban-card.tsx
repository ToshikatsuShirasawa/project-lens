'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KanbanTask } from '@/lib/types'

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
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-secondary">
                {task.assignee.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {task.dueDate}
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
