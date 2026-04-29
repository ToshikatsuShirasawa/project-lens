'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, GripVertical, Sparkles } from 'lucide-react'
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
  onDragEnd: () => void
  columnId: string
  isDragging?: boolean
  justDropped?: boolean
  justAiAdded?: boolean
}

const aiOriginLabel = {
  slack: 'Slack由来',
  report: '報告由来',
  meeting: '議事録由来',
  ai: 'AI抽出',
}

function parseDateOnly(raw: string): Date | null {
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!matched) return null
  const [, y, m, d] = matched
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function dueStatusOf(raw: string | undefined): 'overdue' | 'today' | 'normal' | null {
  if (!raw) return null
  const due = parseDateOnly(raw)
  if (!due) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (due.getTime() < today.getTime()) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return 'normal'
}

function cardAssigneeParts(task: KanbanTask): { initials: string; short: string; full: string } | null {
  if (!task.assignee) return null
  const n = task.assignee.name?.trim()
  if (n) {
    const short = n.length > 8 ? `${n.slice(0, 8)}…` : n
    return { initials: n.slice(0, 2), short, full: n }
  }
  const e = task.assignee.email?.trim()
  if (e) {
    const local = e.split('@')[0] ?? e
    const short = local.length > 10 ? `${local.slice(0, 10)}…` : local
    return {
      initials: local.slice(0, 2).toUpperCase(),
      short,
      full: e,
    }
  }
  return null
}

export function KanbanCard({
  task,
  onEdit,
  onDragStart,
  onDragEnd,
  columnId,
  isDragging = false,
  justDropped = false,
  justAiAdded = false,
}: KanbanCardProps) {
  const dueStatus = dueStatusOf(task.dueDate)
  const isHighPriority = task.priority === 'HIGH'
  const leftAccentClass =
    isHighPriority
      ? 'border-l-red-500'
      : task.priority === 'MEDIUM'
      ? 'border-l-amber-400'
      : task.priority === 'LOW'
      ? 'border-l-slate-300'
      : dueStatus === 'overdue'
      ? 'border-l-red-300'
      : dueStatus === 'today'
      ? 'border-l-amber-300'
      : 'border-l-transparent'

  return (
    <div
      data-kanban-card="true"
      data-task-id={task.id}
      draggable
      onDragStart={() => onDragStart(task.id, columnId)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      className={cn(
        'relative overflow-hidden group cursor-grab active:cursor-grabbing rounded-lg border border-border/60 border-l-2 bg-card p-2.5 transition-all duration-200 ease-out active:scale-[0.99] space-y-1.5',
        'hover:-translate-y-px hover:shadow-md hover:border-primary/30 hover:bg-primary/[0.02]',
        isHighPriority && 'border-l-4',
        leftAccentClass,
        justDropped && 'ring-2 ring-primary/25 bg-primary/[0.04]',
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-lg'
      )}
    >
      {justAiAdded && (
        <div
          className="absolute inset-0 rounded-lg bg-emerald-100/80 pointer-events-none"
          style={{ animation: 'kanbanAiAddOverlay 750ms ease-out forwards' }}
        />
      )}
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <p
        className={cn(
          'text-[13px] font-medium text-foreground leading-snug group-hover:text-primary transition-colors pr-5',
          isHighPriority && 'font-bold'
        )}
      >
        {task.title}
      </p>
      {task.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {task.priority ? (
            <Badge
              variant="secondary"
              className={cn(
                'h-4 px-1.5 text-[9px] font-medium border-0 shrink-0',
                task.priority === 'HIGH' && 'bg-red-100 text-red-800',
                task.priority === 'MEDIUM' && 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
                task.priority === 'LOW' && 'bg-slate-100 text-slate-600'
              )}
            >
              優先:{priorityLabel[task.priority]}
            </Badge>
          ) : null}
          {(() => {
            const ap = cardAssigneeParts(task)
            if (!ap) return null
            return (
              <span
                className="flex items-center gap-1 min-w-0 shrink-0 max-w-[42%]"
                title={`担当: ${ap.full}`}
              >
                <Avatar className="h-4.5 w-4.5 shrink-0">
                  <AvatarFallback className="text-[9px] bg-secondary">{ap.initials}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate max-w-[3.5rem] sm:max-w-[5rem]">
                  担当:{ap.short}
                </span>
              </span>
            )
          })()}
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[10px] truncate">
              <span
                className={cn(
                  'flex items-center gap-0.5 truncate',
                  dueStatus === 'overdue' && 'text-red-600',
                  dueStatus === 'today' && 'text-amber-700',
                  dueStatus === 'normal' && 'text-muted-foreground'
                )}
                title={
                  dueStatus === 'overdue'
                    ? '期限切れ'
                    : dueStatus === 'today'
                    ? '期限は今日です'
                    : undefined
                }
              >
                <Calendar className="h-2.5 w-2.5 shrink-0" />
                {task.dueDate.length >= 10 ? task.dueDate.slice(0, 10) : task.dueDate}
              </span>
              {dueStatus === 'overdue' && (
                <Badge className="h-4 px-1 text-[9px] border-0 bg-red-100 text-red-700">期限切れ</Badge>
              )}
              {dueStatus === 'today' && (
                <Badge className="h-4 px-1 text-[9px] border-0 bg-amber-100 text-amber-700">今日</Badge>
              )}
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
      <style jsx>{`
        @keyframes kanbanAiAddOverlay {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
