"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  Plus, 
  Clock, 
  X, 
  MessageSquare, 
  FileText, 
  BookOpen,
  User,
  Calendar,
  ArrowRight,
  Lightbulb
} from "lucide-react"
import { cn } from "@/lib/utils"

type AISource = "slack" | "report" | "meeting"

interface TaskCandidate {
  id: string
  title: string
  reason: string
  source: AISource
  suggestedAssignee?: string
  suggestedDueDate?: string
}

interface AICandidatesPanelProps {
  candidates: TaskCandidate[]
  onAddToKanban: (candidate: TaskCandidate) => void
  onHold: (candidateId: string) => void
  onDismiss: (candidateId: string) => void
}

const sourceConfig: Record<AISource, { label: string; icon: typeof MessageSquare }> = {
  slack: { label: "Slackから検出", icon: MessageSquare },
  report: { label: "作業報告から生成", icon: FileText },
  meeting: { label: "議事録から抽出", icon: BookOpen },
}

export function AICandidatesPanel({
  candidates,
  onAddToKanban,
  onHold,
  onDismiss,
}: AICandidatesPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [heldIds, setHeldIds] = useState<Set<string>>(new Set())

  const visibleCandidates = candidates.filter(
    (c) => !dismissedIds.has(c.id) && !heldIds.has(c.id)
  )
  const heldCandidates = candidates.filter((c) => heldIds.has(c.id))

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
    onDismiss(id)
  }

  const handleHold = (id: string) => {
    setHeldIds((prev) => new Set([...prev, id]))
    onHold(id)
  }

  const handleUnhold = (id: string) => {
    setHeldIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <div className="w-80 shrink-0 border-l-4 border-l-primary/40 border-t border-b border-r border-border/60 bg-[#EFF6FF]/70 flex flex-col h-full shadow-sm">
      {/* Panel Header */}
      <div className="p-5 border-b border-primary/15 bg-primary/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">AIが見つけたタスク候補</h3>
        </div>
        <p className="text-xs text-muted-foreground pl-12 leading-relaxed">
          会話や報告から未登録タスクを抽出しています
        </p>
        
        {/* Connection hint to Kanban */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-medium text-primary">
            カンバンに追加されます
          </p>
        </div>
      </div>

      {/* Candidates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleCandidates.length === 0 && heldCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              新しいタスク候補はありません
            </p>
          </div>
        ) : (
          <>
            {/* Active Candidates */}
            {visibleCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onAddToKanban={() => onAddToKanban(candidate)}
                onHold={() => handleHold(candidate.id)}
                onDismiss={() => handleDismiss(candidate.id)}
              />
            ))}

            {/* Held Candidates */}
            {heldCandidates.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  保留中 ({heldCandidates.length}件)
                </p>
                {heldCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isHeld
                    onAddToKanban={() => onAddToKanban(candidate)}
                    onUnhold={() => handleUnhold(candidate.id)}
                    onDismiss={() => handleDismiss(candidate.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface CandidateCardProps {
  candidate: TaskCandidate
  isHeld?: boolean
  onAddToKanban: () => void
  onHold?: () => void
  onUnhold?: () => void
  onDismiss: () => void
}

function CandidateCard({
  candidate,
  isHeld,
  onAddToKanban,
  onHold,
  onUnhold,
  onDismiss,
}: CandidateCardProps) {
  const sourceInfo = sourceConfig[candidate.source]
  const SourceIcon = sourceInfo.icon

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        isHeld
          ? "bg-muted/50 border-dashed border-border opacity-70"
          : "bg-card border-border/80 shadow-sm hover:shadow-md"
      )}
    >
      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/70" />
      
      <CardContent className="p-5 pl-6">
        <div className="space-y-3.5">
          {/* Source Badge */}
          <Badge 
            variant="secondary" 
            className="gap-1.5 text-xs bg-primary/10 text-primary border-0 h-6 px-2.5"
          >
            <SourceIcon className="h-3 w-3 shrink-0" />
            <span>{sourceInfo.label}</span>
          </Badge>

          {/* Title - What to do */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">タスク内容</p>
            <h4 className="text-sm font-semibold text-foreground leading-snug">
              {candidate.title}
            </h4>
          </div>

          {/* Reason - Why extracted */}
          <div className="rounded-md bg-muted/50 border border-border/50 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">抽出理由</p>
                <p className="text-xs text-foreground leading-relaxed">
                  {candidate.reason}
                </p>
              </div>
            </div>
          </div>

          {/* Suggested Info */}
          {(candidate.suggestedAssignee || candidate.suggestedDueDate) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {candidate.suggestedAssignee && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3 w-3 shrink-0" />
                  <span>{candidate.suggestedAssignee}</span>
                </span>
              )}
              {candidate.suggestedDueDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{candidate.suggestedDueDate}</span>
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 flex-1 shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onAddToKanban()
              }}
            >
              <Plus className="h-3 w-3" />
              カンバンに追加
            </Button>
            {isHeld ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3"
                onClick={(e) => {
                  e.stopPropagation()
                  onUnhold?.()
                }}
              >
                戻す
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 px-3"
                onClick={(e) => {
                  e.stopPropagation()
                  onHold?.()
                }}
              >
                <Clock className="h-3 w-3" />
                保留
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
