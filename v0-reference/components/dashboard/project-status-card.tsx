"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight, Clock, Lightbulb, Calendar } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type UrgencyLevel = "critical" | "warning" | "normal"

interface ActionOption {
  label: string
  href: string
  isRecommended?: boolean
}

interface ProjectStatusCardProps {
  summary: string
  progress: number
  bottleneck?: string
  bottleneckSource?: "slack" | "report" | "ai" | "meeting"
  bottleneckDelayDays?: number
  nextAction?: string
  nextActionHref?: string
  overallUrgency?: UrgencyLevel
  daysUntilMilestone?: number
  aiRecommendation?: string
  aiRecommendationReason?: string
  actions?: ActionOption[]
}

const sourceLabels: Record<string, string> = {
  slack: "Slackから検出",
  report: "作業報告から生成",
  ai: "AI分析",
  meeting: "議事録から抽出",
}

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string; dotClassName: string }> = {
  critical: { label: "緊急", className: "text-destructive", dotClassName: "bg-destructive" },
  warning: { label: "注意", className: "text-warning", dotClassName: "bg-warning" },
  normal: { label: "順調", className: "text-emerald-600", dotClassName: "bg-emerald-500" },
}

export function ProjectStatusCard({
  summary,
  progress,
  bottleneck,
  bottleneckSource = "ai",
  bottleneckDelayDays,
  nextAction,
  nextActionHref = "/kanban",
  overallUrgency,
  daysUntilMilestone,
  aiRecommendation,
  aiRecommendationReason,
  actions,
}: ProjectStatusCardProps) {
  const urgency = overallUrgency ? urgencyConfig[overallUrgency] : null
  
  return (
    <Card className="bg-card shadow-sm border-border/80">
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-base font-semibold">現在の状況</CardTitle>
        <div className="ml-auto flex items-center gap-2">
          {urgency && (
            <Badge variant="outline" className={cn("gap-1.5 text-xs h-6 px-2.5", urgency.className)}>
              <span className={cn("h-2 w-2 rounded-full", urgency.dotClassName)} />
              <span>{urgency.label}</span>
            </Badge>
          )}
          {daysUntilMilestone !== undefined && (
            <Badge variant="outline" className={cn(
              "gap-1.5 text-xs h-6 px-2.5",
              daysUntilMilestone <= 3 ? "text-destructive border-destructive/30" :
              daysUntilMilestone <= 7 ? "text-warning border-warning/30" :
              "text-muted-foreground"
            )}>
              <Calendar className="h-3 w-3 shrink-0" />
              <span>マイルストーンまで{daysUntilMilestone}日</span>
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1.5 text-xs h-6 px-2.5">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>AI分析</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Summary Section */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            状況サマリー
          </h4>
          <p className="text-sm leading-relaxed text-foreground">{summary}</p>
        </div>

        {/* Progress Bar - Less Prominent */}
        <div className="flex items-center gap-4 rounded-lg bg-muted/30 px-4 py-3 border border-border/60">
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">全体進捗</span>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold text-foreground shrink-0">{progress}%</span>
        </div>

        {/* Bottleneck - More Prominent */}
        {bottleneck && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                <span>何がボトルネックか</span>
              </h4>
              <div className="flex items-center gap-2">
                {bottleneckDelayDays !== undefined && bottleneckDelayDays > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs h-6 px-2 text-destructive border-destructive/30">
                    <Clock className="h-3 w-3" />
                    {bottleneckDelayDays}日遅延中
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs h-6 px-2.5 shrink-0">
                  {sourceLabels[bottleneckSource]}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 shadow-sm">
              <p className="text-sm text-foreground leading-relaxed">{bottleneck}</p>
            </div>
          </div>
        )}
        
        {/* AI Recommendation Layer */}
        {aiRecommendation && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">AI推奨</p>
                <p className="text-sm font-semibold text-foreground">{aiRecommendation}</p>
                {aiRecommendationReason && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    理由: {aiRecommendationReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next Action - Most Prominent with multiple options */}
        {nextAction && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span>今すぐやるべきこと</span>
            </h4>
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 shadow-sm">
              <p className="text-sm font-medium text-foreground leading-relaxed mb-4">{nextAction}</p>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {actions && actions.length > 0 ? (
                    actions.map((action, index) => (
                      <Link key={index} href={action.href}>
                        <Button 
                          size="sm"
                          variant={action.isRecommended ? "default" : "outline"}
                          className={cn(
                            "gap-1.5 h-8",
                            action.isRecommended && "shadow-sm"
                          )}
                        >
                          {action.isRecommended && <Sparkles className="h-3 w-3" />}
                          <span className="text-xs">{action.label}</span>
                          {action.isRecommended && <ArrowRight className="h-3 w-3" />}
                        </Button>
                      </Link>
                    ))
                  ) : (
                    <Link href={nextActionHref}>
                      <Button size="sm" className="gap-1.5 h-8 shadow-sm">
                        <span className="text-xs">対応する</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ArrowRight className="h-2.5 w-2.5" />
                  クリックでカンバンを表示
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
