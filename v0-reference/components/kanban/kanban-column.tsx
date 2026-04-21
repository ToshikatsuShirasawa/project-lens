"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, GripVertical } from "lucide-react"
import { KanbanCard, KanbanCardData } from "./kanban-card"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  id: string
  title: string
  cards: KanbanCardData[]
  onAddCard?: () => void
  onEditCard?: (card: KanbanCardData) => void
  onDragStart?: (cardId: string, columnId: string) => void
  onDragOver?: (columnId: string) => void
  onDrop?: (columnId: string) => void
  isDropTarget?: boolean
}

export function KanbanColumn({
  id,
  title,
  cards,
  onAddCard,
  onEditCard,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
}: KanbanColumnProps) {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId)
    e.dataTransfer.effectAllowed = "move"
    onDragStart?.(cardId, id)
  }

  const handleDragEnd = () => {
    setDraggedCardId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver?.(id)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop?.(id)
  }

  return (
    <div
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-xl bg-muted/40 border border-border/50 transition-colors shadow-sm",
        isDropTarget && "bg-primary/10 ring-2 ring-primary/30"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {cards.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAddCard}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {cards.map((card) => (
          <div
            key={card.id}
            draggable
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDragEnd={handleDragEnd}
          >
            <KanbanCard
              card={card}
              isDragging={draggedCardId === card.id}
              onEdit={onEditCard}
            />
          </div>
        ))}

        {/* Empty State */}
        {cards.length === 0 && (
          <div className="flex flex-col h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted text-center">
            <p className="text-sm text-muted-foreground">カードがありません</p>
            <p className="text-xs text-muted-foreground/70 mt-1">ここにドラッグ</p>
          </div>
        )}
        
        {/* Drag Hint - shown when cards exist */}
        {cards.length > 0 && cards.length <= 2 && (
          <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground/60">
            <GripVertical className="h-3 w-3" />
            <span>ドラッグで移動</span>
          </div>
        )}
      </div>
    </div>
  )
}
