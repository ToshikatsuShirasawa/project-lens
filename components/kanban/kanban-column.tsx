'use client'

import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
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


const columnTopLine: Record<string, string> = {
  backlog: 'bg-slate-300',
  inprogress: 'bg-blue-300',
  blocked: 'bg-red-300',
  review: 'bg-amber-300',
  done: 'bg-emerald-200',
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
  const topLine = columnTopLine[id]
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
        'group/column flex w-72 shrink-0 flex-col rounded-xl overflow-hidden border bg-muted/40 transition-all duration-200 ease-out hover:bg-muted/50',
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
      <div className={cn('h-0.5 w-full', topLine ?? 'bg-border')} />

      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {tasks.length}
          </span>
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
      <div ref={colBodyRef} className="flex flex-col space-y-3 overflow-auto p-3 flex-1 min-h-[120px]">
        {tasks.map((task, idx) => (
          <Fragment key={task.id}>
            {showInsertGuide && insertIndex === idx && (
              <div
                className="h-1 rounded-full bg-primary/60 shadow-sm transition-transform duration-120 ease-out scale-x-105 opacity-0"
                style={insertGuideStyle}
              />
            )}
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
          </Fragment>
        ))}
        {showInsertGuide && insertIndex === tasks.length && tasks.length > 0 && (
          <div
            className="h-1 rounded-full bg-primary/60 shadow-sm transition-transform duration-120 ease-out scale-x-105 opacity-0"
            style={insertGuideStyle}
          />
        )}
        {tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted py-5 text-center">
            {tasksLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  タスクを読み込んでいます...
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {id === 'backlog' ? 'まずはここからタスクを追加しましょう' : 'タスクがありません'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddCard}
                  className="h-7 px-2.5 text-xs text-primary hover:text-primary"
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
