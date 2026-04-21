"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, GripVertical, MessageSquare, FileText, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

type AIOrigin = "slack" | "report" | "meeting"

export interface KanbanCardData {
  id: string
  title: string
  description?: string
  assignee?: { name: string; avatar?: string }
  dueDate?: string
  // AI origin indicates where this confirmed task originally came from
  aiOrigin?: AIOrigin
}

interface KanbanCardProps {
  card: KanbanCardData
  isDragging?: boolean
  onEdit?: (card: KanbanCardData) => void
}

const aiOriginConfig: Record<AIOrigin, { label: string; icon: typeof MessageSquare }> = {
  slack: { label: "Slack由来", icon: MessageSquare },
  report: { label: "作業報告由来", icon: FileText },
  meeting: { label: "議事録由来", icon: BookOpen },
}

export function KanbanCard({ card, isDragging, onEdit }: KanbanCardProps) {
  const hasAiOrigin = !!card.aiOrigin
  const aiOriginInfo = card.aiOrigin ? aiOriginConfig[card.aiOrigin] : null
  const OriginIcon = aiOriginInfo?.icon

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card transition-all cursor-grab active:cursor-grabbing",
        "border-border/80 shadow-sm hover:shadow-md hover:border-border",
        isDragging && "opacity-50 rotate-2 scale-105 shadow-lg"
      )}
      onClick={() => onEdit?.(card)}
    >
      {/* Drag Handle */}
      <div className="absolute right-3 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <h4 className="text-sm font-medium text-foreground leading-snug pr-6">{card.title}</h4>

        {/* Description */}
        {card.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{card.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2.5 pt-2 flex-wrap border-t border-border/40">
          {/* Due Date */}
          {card.dueDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{card.dueDate}</span>
            </div>
          )}
          {/* Subtle AI origin indicator */}
          {hasAiOrigin && aiOriginInfo && OriginIcon && (
            <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground h-5 px-1.5 shrink-0">
              <OriginIcon className="h-2.5 w-2.5" />
              <span>{aiOriginInfo.label}</span>
            </Badge>
          )}

          {/* Assignee - pushed to end */}
          {card.assignee && (
            <Avatar className="h-6 w-6 ml-auto shrink-0 ring-2 ring-background">
              <AvatarImage src={card.assignee.avatar} alt={card.assignee.name} />
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                {card.assignee.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  )
}
