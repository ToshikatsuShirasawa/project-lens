"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clock, Calendar, Brain } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type UrgencyLevel = "critical" | "warning" | "normal"

interface ActionOption {
  label: string
  href: string
  isRecommended?: boolean
  effort?: "low" | "medium" | "high"
  impact?: "low" | "medium" | "high"
  purpose?: string
  outcome?: string
  expectedTimeline?: string
}

interface ImpactTimelineItem {
  days: number
  description: string
  severity: "warning" | "critical"
}

interface ActionTimelineItem {
  timing: string
  action: string
  outcome: string
}

interface TopPriorityCardProps {
  situation: string
  context: string
  urgency?: UrgencyLevel
  delayDays?: number
  daysUntilDeadline?: number
  impactTimeline?: ImpactTimelineItem[]
  actionTimeline?: ActionTimelineItem[]
  aiDecision: string
  aiReason: string
  alternatives?: ActionOption[]
  primaryAction: ActionOption
}

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string; bgClassName: string; borderClassName: string; accentClassName: string; softClassName: string }> = {
  critical: {
    label: "優先度高",
    className: "bg-orange-500 text-white",
    bgClassName: "bg-orange-50",
    borderClassName: "border-orange-200",
    accentClassName: "bg-orange-500",
    softClassName: "bg-orange-100 border-orange-200"
  },
  warning: {
    label: "要確認",
    className: "bg-amber-500 text-white",
    bgClassName: "bg-amber-50",
    borderClassName: "border-amber-200",
    accentClassName: "bg-amber-500",
    softClassName: "bg-amber-100 border-amber-200"
  },
  normal: {
    label: "通常",
    className: "bg-emerald-500 text-white",
    bgClassName: "bg-emerald-50",
    borderClassName: "border-emerald-200",
    accentClassName: "bg-emerald-500",
    softClassName: "bg-emerald-100 border-emerald-200"
  },
}

const effortLabels = { low: "低", medium: "中", high: "高" }
const impactLabels = { low: "小", medium: "中", high: "大" }

export function TopPriorityCard({
  situation,
  context,
  urgency = "critical",
  delayDays,
  daysUntilDeadline,
  impactTimeline,
  actionTimeline,
  aiDecision,
  aiReason,
  alternatives,
  primaryAction,
}: TopPriorityCardProps) {
  const urgencyStyle = urgencyConfig[urgency]

  return (
    <Card className={cn(
      "relative overflow-hidden shadow-lg",
      urgencyStyle.borderClassName,
      urgencyStyle.bgClassName
    )}>
      {/* Left Accent */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", urgencyStyle.accentClassName)} />

      <CardContent className="relative p-6 pl-7">
        {/* Section 1: Situation */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 shadow-sm">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI意思決定サポート</p>
                <h2 className="text-base font-bold text-foreground">今日の確認事項</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("gap-1.5 text-xs h-6 px-2.5", urgencyStyle.className.replace('text-white', ''))}>
                <span>{urgencyStyle.label}</span>
              </Badge>
              {delayDays !== undefined && delayDays > 0 && (
                <Badge variant="outline" className="gap-1.5 text-xs h-6 px-2.5 text-orange-600 border-orange-300">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{delayDays}日遅延</span>
                </Badge>
              )}
              {daysUntilDeadline !== undefined && (
                <Badge variant="outline" className={cn(
                  "gap-1.5 text-xs h-6 px-2.5",
                  daysUntilDeadline <= 3 ? "text-orange-600 border-orange-300" :
                  daysUntilDeadline <= 7 ? "text-amber-600 border-amber-300" :
                  "text-muted-foreground border-border"
                )}>
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>残り{daysUntilDeadline}日</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Situation Summary */}
          <div className="rounded-lg bg-card border border-border p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">状況</p>
            <h3 className="text-lg font-bold text-foreground leading-relaxed mb-3 max-w-prose">{situation}</h3>
            <p className="text-sm text-muted-foreground leading-loose max-w-prose">{context}</p>
          </div>

          {/* Section 2: Dual Timeline Comparison */}
          {(impactTimeline && impactTimeline.length > 0) || (actionTimeline && actionTimeline.length > 0) ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Negative Path - If no action */}
              {impactTimeline && impactTimeline.length > 0 && (
                <div className="rounded-lg bg-card border border-orange-200 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 mb-4">このままだと</p>
                  <div className="space-y-3">
                    {impactTimeline.map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white",
                            item.severity === "critical" ? "bg-orange-500" : "bg-amber-500"
                          )}>
                            {item.days}
                          </div>
                          {index < impactTimeline.length - 1 && (
                            <div className="w-px h-4 bg-orange-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={cn(
                            "text-xs font-semibold",
                            item.severity === "critical" ? "text-orange-600" : "text-amber-600"
                          )}>
                            {item.days}日後
                          </p>
                          <p className="text-sm text-foreground">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive Path - If action taken */}
              {actionTimeline && actionTimeline.length > 0 && (
                <div className="rounded-lg bg-card border border-emerald-200 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-4">対応すると</p>
                  <div className="space-y-3">
                    {actionTimeline.map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                          {index < actionTimeline.length - 1 && (
                            <div className="w-px h-4 bg-emerald-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-xs font-semibold text-emerald-600">{item.timing}</p>
                          <p className="text-sm font-medium text-foreground">{item.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.outcome}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Section 3: AI Decision - Calm & Clear */}
          <div className={cn(
            "rounded-lg p-5 border",
            urgencyStyle.softClassName
          )}>
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">AIからの提案</p>
                <p className="text-lg font-bold text-foreground leading-relaxed max-w-prose">{aiDecision}</p>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">この提案の理由</p>
                  <p className="text-sm text-foreground leading-loose max-w-prose">{aiReason}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Alternatives - Secondary, compact */}
          {alternatives && alternatives.length > 0 && (
            <div className="pt-2">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  別の選択肢を見る（{alternatives.length}件）
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {alternatives.map((alt, index) => (
                    <Link key={index} href={alt.href} className="block">
                      <div className="rounded-md bg-muted/50 border border-border hover:border-primary/40 transition-all px-3 py-2">
                        <span className="text-sm text-foreground">{alt.label}</span>
                        {alt.effort && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({alt.effort === "low" ? "すぐ" : alt.effort === "medium" ? "数日" : "1週間+"})
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Section 5: Primary Action with Outcome */}
          <div className="rounded-lg p-5 -mx-6 px-6 -mb-6 bg-primary/5 border-t border-primary/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {primaryAction.label}
                      {primaryAction.purpose && (
                        <span className="font-normal text-muted-foreground">（{primaryAction.purpose}）</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Outcome section */}
                {(primaryAction.outcome || primaryAction.expectedTimeline) && (
                  <div className="ml-13 pl-13 border-l-2 border-primary/30 ml-5 pl-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">実行後の見込み</p>
                    {primaryAction.outcome && (
                      <p className="text-sm text-foreground">{primaryAction.outcome}</p>
                    )}
                    {primaryAction.expectedTimeline && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {primaryAction.expectedTimeline}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Link href={primaryAction.href} className="shrink-0">
                <Button size="lg" className="gap-2 whitespace-nowrap shadow-sm font-semibold">
                  実行する
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
