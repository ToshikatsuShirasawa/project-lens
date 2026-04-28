'use client'

import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus } from 'lucide-react'
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
  onDragEnd: () => void
  onDragOver: (columnId: string, insertIndex: number) => void
  onDrop: (columnId: string, insertIndex?: number) => void
  isDropTarget: boolean
  draggedTaskId: string | null
  justDropped: boolean
  justDroppedTaskId: string | null
  tasksLoading?: boolean
  justAiAdded?: boolean
  justAiAddedTaskId?: string | null
}

const columnColors: Record<string, string> = {
  backlog: 'bg-slate-100 text-slate-600',
  inprogress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  review: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
}

const columnTheme: Record<
  string,
  {
    topLine: string
    hover: string
    emptyWrap: string
    emptyText: string
  }
> = {
  backlog: {
    topLine: 'bg-slate-300',
    hover: 'hover:bg-slate-50/70',
    emptyWrap: 'border-slate-200/60 bg-slate-50/70',
    emptyText: 'text-slate-600/80',
  },
  inprogress: {
    topLine: 'bg-blue-300',
    hover: 'hover:bg-blue-50/60',
    emptyWrap: 'border-blue-200/60 bg-blue-50/70',
    emptyText: 'text-blue-700/80',
  },
  blocked: {
    topLine: 'bg-red-300',
    hover: 'hover:bg-red-50/60',
    emptyWrap: 'border-red-200/60 bg-red-50/70',
    emptyText: 'text-red-700/80',
  },
  review: {
    topLine: 'bg-amber-300',
    hover: 'hover:bg-amber-50/70',
    emptyWrap: 'border-amber-200/60 bg-amber-50/70',
    emptyText: 'text-amber-700/80',
  },
  done: {
    topLine: 'bg-emerald-200',
    hover: 'hover:bg-emerald-50/50',
    emptyWrap: 'border-emerald-200/60 bg-emerald-50/55',
    emptyText: 'text-emerald-700/80',
  },
}

export function KanbanColumn({
  id,
  title,
  tasks,
  onAddCard,
  onEditCard,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDropTarget,
  draggedTaskId,
  justDropped,
  justDroppedTaskId,
  tasksLoading = false,
  justAiAdded = false,
  justAiAddedTaskId = null,
}: KanbanColumnProps) {
  const theme = columnTheme[id]
  const [insertIndex, setInsertIndex] = useState<number>(tasks.length)
  const colBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (insertIndex > tasks.length) setInsertIndex(tasks.length)
  }, [insertIndex, tasks.length])

  useEffect(() => {
    if (!justAiAddedTaskId) return
    const raf = requestAnimationFrame(() => {
      const cardEl = colBodyRef.current?.querySelector<HTMLElement>(`[data-task-id="${justAiAddedTaskId}"]`)
      cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(raf)
  }, [justAiAddedTaskId])

  const calcInsertIndex = (e: DragEvent<HTMLDivElement>) => {
    const cardNodes = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[data-kanban-card="true"]')
    )
    const pointerY = e.clientY
    for (let i = 0; i < cardNodes.length; i += 1) {
      const rect = cardNodes[i].getBoundingClientRect()
      if (pointerY < rect.top + rect.height / 2) return i
    }
    return cardNodes.length
  }

  const showInsertGuide = Boolean(draggedTaskId) && isDropTarget
  const insertGuideStyle = { animation: 'kanbanInsertFadeIn 120ms ease forwards' } as const

  return (
    <div
      id={`kanban-col-${id}`}
      className={cn(
        'group/column flex w-72 shrink-0 flex-col rounded-xl overflow-hidden border bg-muted/30 transition-all duration-200 ease-out',
        theme?.hover,
        justDropped && 'ring-2 ring-primary/20 bg-primary/[0.04]',
        justAiAdded && 'ring-2 ring-emerald-300/60 bg-emerald-50/30',
        isDropTarget
          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-border/80'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        const idx = calcInsertIndex(e)
        setInsertIndex(idx)
        onDragOver(id, idx)
      }}
      onDrop={() => onDrop(id, insertIndex)}
    >
      <div className={cn('h-0.5 w-full', theme?.topLine ?? 'bg-border')} />

      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 pb-2.5 pt-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge
            className={cn(
              'h-4.5 px-1.5 text-[10px] font-medium border-0',
              columnColors[id] ?? 'bg-muted text-muted-foreground'
            )}
          >
            {tasks.length}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-md text-muted-foreground/90 hover:text-foreground hover:bg-background/80 group-hover/column:bg-background/60"
          onClick={onAddCard}
          aria-label={`${title} にタスクを追加`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div ref={colBodyRef} className="flex flex-col gap-1 p-2.5 flex-1 min-h-[120px]">
        {tasks.map((task, idx) => (
          <Fragment key={task.id}>
            {showInsertGuide && insertIndex === idx && (
              <div
                className="h-1 rounded-full bg-primary/60 shadow-sm transition-transform duration-120 ease-out scale-x-105 opacity-0"
                style={insertGuideStyle}
              />
            )}
            <div className={cn(idx > 0 && 'mt-1.5')}>
              <KanbanCard
                task={task}
                columnId={id}
                onEdit={onEditCard}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                isDragging={draggedTaskId === task.id}
                justDropped={justDroppedTaskId === task.id}
                justAiAdded={justAiAddedTaskId === task.id}
              />
            </div>
          </Fragment>
        ))}
        {showInsertGuide && insertIndex === tasks.length && tasks.length > 0 && (
          <div
            className="h-1 rounded-full bg-primary/60 shadow-sm transition-transform duration-120 ease-out scale-x-105 opacity-0"
            style={insertGuideStyle}
          />
        )}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-5 text-center',
              theme?.emptyWrap ?? 'border-border/80 bg-background/50'
            )}
          >
            {tasksLoading ? (
              <>
                <Loader2 className={cn('h-4 w-4 animate-spin text-muted-foreground/50', theme?.emptyText)} />
                <p className={cn('text-xs text-muted-foreground', theme?.emptyText)}>
                  タスクを読み込んでいます...
                </p>
              </>
            ) : (
              <>
                <p className={cn('text-xs text-muted-foreground', theme?.emptyText)}>
                  {id === 'backlog' ? 'まずはここからタスクを追加しましょう' : 'タスクがありません'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddCard}
                  className={cn('h-7 px-2.5 text-xs text-primary hover:text-primary', theme?.hover)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  タスクを追加
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes kanbanInsertFadeIn {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
