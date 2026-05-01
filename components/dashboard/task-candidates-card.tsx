"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  MessageSquare,
  FileText,
  BookOpen,
  StickyNote,
  Plus,
  Clock,
  X,
  Calendar,
  User,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"

const IMMEDIATE_TASK_KEYWORDS = ["必要", "修正", "対応", "実装", "期限"]
const REVIEW_TASK_KEYWORDS = ["確認", "調査", "検討"]

type AISource = "slack" | "report" | "meeting" | "memo"
type TaskCandidateDisplayGroupId = "immediate" | "review"

interface TaskCandidate {
  id: string
  title: string
  reason: string
  source: AISource
  suggestedAssignee?: string
  suggestedDueDate?: string
  mergedCount?: number
  mergedSources?: AISource[]
}

interface GroupedTaskCandidate {
  candidate: TaskCandidate
  index: number
}

interface TaskCandidateDisplayGroup {
  id: TaskCandidateDisplayGroupId
  label: string
  candidates: GroupedTaskCandidate[]
}

interface TaskCandidatesCardProps {
  candidates: TaskCandidate[]
  kanbanHref?: string
  onAddToKanban?: (id: string) => void
  onHold?: (id: string) => void
  onDismiss?: (id: string) => void
}

const sourceConfig: Record<
  AISource,
  { label: string; icon: typeof MessageSquare; color: string }
> = {
  slack: {
    label: "Slackメモから抽出",
    icon: MessageSquare,
    color: "text-blue-400",
  },
  report: {
    label: "作業報告から生成",
    icon: FileText,
    color: "text-green-400",
  },
  meeting: { label: "議事録から抽出", icon: BookOpen, color: "text-amber-400" },
  memo: { label: "メモから抽出", icon: StickyNote, color: "text-orange-400" },
}

function sourceSummary(candidate: TaskCandidate): string {
  const sources = candidate.mergedSources?.length ? candidate.mergedSources : [candidate.source]
  return Array.from(new Set(sources)).map((source) => sourceConfig[source].label.replace(/から.*$/, '')).join(" / ")
}

function classifyTaskCandidateByTitle(
  candidate: TaskCandidate,
): TaskCandidateDisplayGroupId {
  const title = candidate.title
  if (IMMEDIATE_TASK_KEYWORDS.some((keyword) => title.includes(keyword))) {
    return "immediate"
  }
  if (REVIEW_TASK_KEYWORDS.some((keyword) => title.includes(keyword))) {
    return "review"
  }
  return "review"
}

function groupTaskCandidatesByTitle(
  candidates: TaskCandidate[],
): TaskCandidateDisplayGroup[] {
  const groups: Record<TaskCandidateDisplayGroupId, TaskCandidateDisplayGroup> =
    {
      immediate: { id: "immediate", label: "すぐやるべき", candidates: [] },
      review: { id: "review", label: "あとで確認", candidates: [] },
    }

  candidates.forEach((candidate, index) => {
    groups[classifyTaskCandidateByTitle(candidate)].candidates.push({
      candidate,
      index,
    })
  })

  return [groups.immediate, groups.review]
}

export function TaskCandidatesCard({
  candidates,
  kanbanHref,
  onAddToKanban,
  onHold,
  onDismiss,
}: TaskCandidatesCardProps) {
  const [localCandidates, setLocalCandidates] = useState(candidates)

  useEffect(() => {
    setLocalCandidates(candidates)
  }, [candidates])

  const candidateGroups = groupTaskCandidatesByTitle(localCandidates)

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
          <p className="text-sm font-medium text-foreground">
            候補はありません
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            作業報告から、まだタスク候補は見つかっていません。
            <br />
            報告に「確認が必要」「対応予定」「依頼中」などの内容があると候補として表示されます。
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
          <CardTitle className="text-base font-semibold">
            AIが見つけたタスク候補
          </CardTitle>
          <p className="text-xs font-medium text-primary mt-1">
            優先度別に確認できます
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            作業報告などから見つけた「まだ確定していないタスク候補」です
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-xs h-6 px-2.5 shrink-0 bg-primary/10 text-primary self-start"
        >
          {localCandidates.length}件
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {candidateGroups.map((group) => (
          <section key={group.id} className="space-y-2">
            <div className="px-1 pb-1">
              <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
                ■ {group.label}
              </p>
            </div>
            {group.candidates.length === 0 ? (
              <p className="px-1 pb-2 text-[11px] text-muted-foreground/60">
                該当する候補はありません
              </p>
            ) : (
              group.candidates.map(({ candidate, index }) => {
                const sourceInfo = sourceConfig[candidate.source]
                const SourceIcon = sourceInfo.icon
                const isTopCandidate = index === 0
                const isTopThree = index < 3

                const card = (
                  <div
                    key={candidate.id}
                    className={cn(
                      "relative rounded-lg border pl-6 pr-5 pt-4 pb-5 transition-all hover:shadow-md shadow-sm overflow-hidden",
                      isTopCandidate
                        ? "border-primary/30 bg-primary/[0.04]"
                        : isTopThree
                          ? "border-border/70 bg-card"
                          : "border-border/60 bg-card",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1.5",
                        isTopCandidate
                          ? "bg-primary"
                          : isTopThree
                            ? "bg-primary/55"
                            : "bg-primary/25",
                      )}
                    />
                    {isTopCandidate ? (
                      <Badge className="text-[10px] h-4 px-1.5 border-0 bg-primary text-primary-foreground mb-2 inline-flex">
                        まず確認
                      </Badge>
                    ) : isTopThree ? (
                      <Badge className="text-[10px] h-4 px-1.5 border-0 bg-primary/15 text-primary mb-2 inline-flex">
                        上位候補
                      </Badge>
                    ) : null}
                    {/* Source */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <SourceIcon className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/50">
                        由来: {sourceSummary(candidate)}
                      </span>
                    </div>

                    {/* Title - What to do */}
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        タスク内容
                      </p>
                      <h4 className="text-sm font-semibold text-foreground leading-snug">
                        {candidate.title}
                      </h4>
                      {(candidate.mergedCount ?? 1) > 1 && (
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          （同様の候補が{candidate.mergedCount}件）
                        </p>
                      )}
                      {candidate.reason?.trim() && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          理由：{candidate.reason.trim()}
                        </p>
                      )}
                    </div>

                    {/* Suggestions */}
                    {(candidate.suggestedAssignee ||
                      candidate.suggestedDueDate) && (
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
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs shadow-sm"
                        onClick={() => handleAddToKanban(candidate.id)}
                      >
                        <Plus className="h-3 w-3" />
                        タスクに追加
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleHold(candidate.id)}
                        title="このセッションのみ非表示（再読み込みで復活します）"
                      >
                        <Clock className="h-3 w-3" />
                        あとで
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDismiss(candidate.id)}
                        title="このセッションのみ非表示（再読み込みで復活します）"
                      >
                        <X className="h-3 w-3" />
                        却下
                      </Button>
                    </div>
                  </div>
                )
                return card
              })
            )}
          </section>
        ))}
        {kanbanHref ? (
          <a href={kanbanHref}>
            <Button
              variant="ghost"
              className="w-full gap-1.5 text-xs h-8 text-muted-foreground"
            >
              AI候補を確認する
              <ChevronRight className="h-3 w-3" />
            </Button>
          </a>
        ) : (
          <Button
            variant="ghost"
            className="w-full gap-1.5 text-xs h-8 text-muted-foreground"
          >
            AI候補を確認する
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
