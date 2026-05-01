"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, Sparkles, MessageSquare, FileText, BookOpen, StickyNote, ArrowRight, Clock, Calendar, Lightbulb } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Severity = "high" | "medium" | "low"
type UrgencyLevel = "critical" | "warning" | "normal"
type Source = "slack" | "report" | "ai" | "meeting" | "memo"

interface Issue {
  id: string
  title: string
  description: string
  severity: Severity
  source: Source
  impact?: string
  urgency?: UrgencyLevel
  delayDays?: number
  daysUntilDeadline?: number
  aiRecommendation?: string
}

interface IssuesRisksCardProps {
  issues: Issue[]
}

const severityConfig: Record<Severity, { label: string; className: string; order: number }> = {
  high: { label: "高", className: "bg-destructive text-destructive-foreground", order: 1 },
  medium: { label: "中", className: "bg-warning text-warning-foreground", order: 2 },
  low: { label: "低", className: "bg-muted text-muted-foreground", order: 3 },
}

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string; dotClassName: string }> = {
  critical: { label: "緊急", className: "text-destructive", dotClassName: "bg-destructive" },
  warning: { label: "注意", className: "text-warning", dotClassName: "bg-warning" },
  normal: { label: "余裕あり", className: "text-emerald-600", dotClassName: "bg-emerald-500" },
}

const sourceConfig: Record<Source, { label: string; icon: typeof MessageSquare }> = {
  slack: { label: "Slackメモから抽出", icon: MessageSquare },
  report: { label: "作業報告から生成", icon: FileText },
  ai: { label: "AI分析", icon: Sparkles },
  meeting: { label: "議事録から抽出", icon: BookOpen },
  memo: { label: "メモから抽出", icon: StickyNote },
}

export function IssuesRisksCard({ issues }: IssuesRisksCardProps) {
  // Sort by severity
  const sortedIssues = [...issues].sort(
    (a, b) => severityConfig[a.severity].order - severityConfig[b.severity].order
  )

  return (
    <Card className="bg-card shadow-sm border-border/80">
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <CardTitle className="text-base font-semibold">課題とリスク</CardTitle>
        <Badge variant="secondary" className="ml-auto h-6 px-2.5 text-xs">
          {issues.length}件
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {sortedIssues.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            現在検出されている課題はありません
          </p>
        ) : (
          sortedIssues.map((issue, index) => {
            const severity = severityConfig[issue.severity]
            const source = sourceConfig[issue.source]
            const SourceIcon = source.icon
            const isHighest = index === 0 && issue.severity === "high"

            const urgency = issue.urgency ? urgencyConfig[issue.urgency] : null

            return (
              <div
                key={issue.id}
                className={cn(
                  "group flex flex-col gap-3 rounded-lg border p-4 transition-all",
                  issue.urgency === "critical"
                    ? "border-destructive/40 bg-destructive/5 shadow-sm"
                    : issue.urgency === "warning"
                    ? "border-warning/40 bg-warning/5 shadow-sm"
                    : "border-border/70 bg-muted/20 hover:bg-muted/40 hover:shadow-sm"
                )}
              >
                {/* Header with urgency indicator */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {urgency && (
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", urgency.dotClassName)} />
                        <span className={cn("text-xs font-semibold", urgency.className)}>{urgency.label}</span>
                      </div>
                    )}
                    {issue.delayDays !== undefined && issue.delayDays > 0 && (
                      <Badge variant="outline" className="gap-1 text-[10px] h-5 px-1.5 text-destructive border-destructive/30">
                        <Clock className="h-2.5 w-2.5" />
                        {issue.delayDays}日遅延
                      </Badge>
                    )}
                    {issue.daysUntilDeadline !== undefined && (
                      <Badge variant="outline" className={cn(
                        "gap-1 text-[10px] h-5 px-1.5",
                        issue.daysUntilDeadline <= 1 ? "text-destructive border-destructive/30" :
                        issue.daysUntilDeadline <= 3 ? "text-warning border-warning/30" :
                        "text-muted-foreground border-border"
                      )}>
                        <Calendar className="h-2.5 w-2.5" />
                        残り{issue.daysUntilDeadline}日
                      </Badge>
                    )}
                  </div>
                  <Badge className={cn(severity.className, "shrink-0 h-5 px-2")}>{severity.label}</Badge>
                </div>

                {/* Title */}
                <h4 className={cn(
                  "text-sm text-foreground leading-snug",
                  issue.urgency === "critical" ? "font-semibold" : "font-medium"
                )}>
                  {issue.title}
                </h4>

                <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>

                {/* Impact - show for high severity */}
                {issue.impact && issue.severity === "high" && (
                  <p className="text-xs text-destructive font-medium">
                    影響: {issue.impact}
                  </p>
                )}

                {/* AI Recommendation */}
                {issue.aiRecommendation && (
                  <div className="rounded-md bg-primary/5 border border-primary/15 p-2.5">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">AI推奨</p>
                        <p className="text-xs text-foreground">{issue.aiRecommendation}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <Badge variant="outline" className="gap-1.5 text-xs h-6 px-2">
                    <SourceIcon className="h-3 w-3 shrink-0" />
                    <span>{source.label}</span>
                  </Badge>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      variant={issue.urgency === "critical" ? "default" : "ghost"}
                      className={cn(
                        "h-7 gap-1.5 text-xs",
                        issue.urgency !== "critical" && "opacity-0 transition-opacity group-hover:opacity-100"
                      )}
                      asChild
                    >
                      <Link href="/kanban">
                        <ArrowRight className="h-3 w-3" />
                        対応する
                      </Link>
                    </Button>
                    {issue.urgency === "critical" && (
                      <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        タスクを作成
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
