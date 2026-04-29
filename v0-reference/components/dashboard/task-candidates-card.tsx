"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sparkles,
  MessageSquare,
  FileText,
  BookOpen,
  Plus,
  Clock,
  X,
  Calendar,
  User,
  ChevronRight,
  ArrowRight,
  Lightbulb,
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

interface TaskCandidatesCardProps {
  candidates: TaskCandidate[]
  onAddToKanban?: (id: string) => void
  onHold?: (id: string) => void
  onDismiss?: (id: string) => void
}

const sourceConfig: Record<AISource, { label: string; icon: typeof MessageSquare; color: string }> = {
  slack: { label: "Slackから検出", icon: MessageSquare, color: "text-blue-400" },
  report: { label: "作業報告から生成", icon: FileText, color: "text-green-400" },
  meeting: { label: "議事録から抽出", icon: BookOpen, color: "text-amber-400" },
}

export function TaskCandidatesCard({
  candidates,
  onAddToKanban,
  onHold,
  onDismiss,
}: TaskCandidatesCardProps) {
  const [localCandidates, setLocalCandidates] = useState(candidates)

  const handleAddToKanban = (id: string) => {
    setLocalCandidates((prev) => prev.filter((c) => c.id !== id))
    onAddToKanban?.(id)
  }

  const handleHold = (id: string) => {
    setLocalCandidates((prev) => prev.filter((c) => c.id !== id))
    onHold?.(id)
  }

  const handleDismiss = (id: string) => {
    setLocalCandidates((prev) => prev.filter((c) => c.id !== id))
    onDismiss?.(id)
  }

  if (localCandidates.length === 0) {
    return (
      <Card className="bg-card border-dashed border-muted-foreground/30">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">タスク候補はありません</p>
          <p className="text-xs text-muted-foreground mt-1">
            Slackや作業報告から新しいタスク候補が見つかると、ここに表示されます
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#EFF6FF]/50 border-l-4 border-l-primary border-t border-r border-b border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold">AIが見つけたタスク候補</CardTitle>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-primary">
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="font-medium">カンバンに追加されます</span>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs h-6 px-2.5 shrink-0 bg-primary/10 text-primary">
          {localCandidates.length}件
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {localCandidates.map((candidate) => {
          const sourceInfo = sourceConfig[candidate.source]
          const SourceIcon = sourceInfo.icon

          return (
            <div
              key={candidate.id}
              className="relative rounded-lg border border-border/70 bg-card p-5 transition-all hover:shadow-md shadow-sm"
            >
              {/* Source Badge */}
              <div className="flex items-center gap-2 mb-3">
                <SourceIcon className={cn("h-3.5 w-3.5 shrink-0", sourceInfo.color)} />
                <span className="text-xs text-muted-foreground">{sourceInfo.label}</span>
              </div>

              {/* Title - What to do */}
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">タスク内容</p>
                <h4 className="text-sm font-semibold text-foreground leading-snug">
                  {candidate.title}
                </h4>
              </div>

              {/* Reason - Why extracted */}
              <div className="rounded-md bg-muted/50 border border-border/50 p-3 mb-4">
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

              {/* Suggestions */}
              {(candidate.suggestedAssignee || candidate.suggestedDueDate) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {candidate.suggestedAssignee && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5">
                      <User className="h-3 w-3 shrink-0" />
                      <span>{candidate.suggestedAssignee}</span>
                    </div>
                  )}
                  {candidate.suggestedDueDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{candidate.suggestedDueDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs shadow-sm"
                  onClick={() => handleAddToKanban(candidate.id)}
                >
                  <Plus className="h-3 w-3" />
                  カンバンに追加
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => handleHold(candidate.id)}
                >
                  <Clock className="h-3 w-3" />
                  保留
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleDismiss(candidate.id)}
                >
                  <X className="h-3 w-3" />
                  不要
                </Button>
              </div>
            </div>
          )
        })}

        {localCandidates.length > 0 && (
          <Button variant="ghost" className="w-full gap-1.5 text-xs h-8 text-muted-foreground">
            すべての候補を確認
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
