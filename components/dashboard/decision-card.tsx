'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Clock, Calendar, Brain } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { DecisionCard as DecisionCardType } from '@/lib/types'

const urgencyConfig = {
  critical: {
    label: '優先度高',
    badgeClass: 'bg-orange-500 text-white',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    accentClass: 'bg-orange-500',
    softClass: 'bg-orange-100 border-orange-200',
  },
  warning: {
    label: '要確認',
    badgeClass: 'bg-amber-500 text-white',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    accentClass: 'bg-amber-500',
    softClass: 'bg-amber-100 border-amber-200',
  },
  normal: {
    label: '通常',
    badgeClass: 'bg-emerald-500 text-white',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    accentClass: 'bg-emerald-500',
    softClass: 'bg-emerald-100 border-emerald-200',
  },
}

interface DecisionCardProps {
  data: DecisionCardType
}

export function DecisionCard({ data }: DecisionCardProps) {
  const {
    situation,
    context,
    urgency = 'critical',
    delayDays,
    daysUntilDeadline,
    impactTimeline,
    actionTimeline,
    aiDecision,
    aiReason,
    alternatives,
    primaryAction,
  } = data

  const style = urgencyConfig[urgency]

  return (
    <Card className={cn('relative overflow-hidden shadow-lg', style.borderClass, style.bgClass)}>
      {/* Left accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', style.accentClass)} />

      <CardContent className="relative p-6 pl-7">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 shadow-sm">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  AI意思決定サポート
                </p>
                <h2 className="text-base font-bold text-foreground">今日の確認事項</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('gap-1.5 text-xs h-6 px-2.5', style.badgeClass)}>
                {style.label}
              </Badge>
              {delayDays !== undefined && delayDays > 0 && (
                <Badge variant="outline" className="gap-1.5 text-xs h-6 px-2.5 text-orange-600 border-orange-300">
                  <Clock className="h-3 w-3 shrink-0" />
                  {delayDays}日遅延
                </Badge>
              )}
              {daysUntilDeadline !== undefined && (
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1.5 text-xs h-6 px-2.5',
                    daysUntilDeadline <= 3
                      ? 'text-orange-600 border-orange-300'
                      : daysUntilDeadline <= 7
                      ? 'text-amber-600 border-amber-300'
                      : 'text-muted-foreground border-border'
                  )}
                >
                  <Calendar className="h-3 w-3 shrink-0" />
                  残り{daysUntilDeadline}日
                </Badge>
              )}
            </div>
          </div>

          {/* Situation */}
          <div className="rounded-lg bg-card border border-border p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              状況
            </p>
            <h3 className="text-lg font-bold text-foreground leading-relaxed mb-3 max-w-prose">
              {situation}
            </h3>
            <p className="text-sm text-muted-foreground leading-loose max-w-prose">{context}</p>
          </div>

          {/* Dual Timeline */}
          {(impactTimeline.length > 0 || actionTimeline.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Negative path */}
              {impactTimeline.length > 0 && (
                <div className="rounded-lg bg-card border border-orange-200 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 mb-4">
                    このままだと
                  </p>
                  <div className="space-y-3">
                    {impactTimeline.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white',
                              item.severity === 'critical' ? 'bg-orange-500' : 'bg-amber-500'
                            )}
                          >
                            {item.days}
                          </div>
                          {i < impactTimeline.length - 1 && (
                            <div className="w-px h-4 bg-orange-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p
                            className={cn(
                              'text-xs font-semibold',
                              item.severity === 'critical' ? 'text-orange-600' : 'text-amber-600'
                            )}
                          >
                            {item.days}日後
                          </p>
                          <p className="text-sm text-foreground">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive path */}
              {actionTimeline.length > 0 && (
                <div className="rounded-lg bg-card border border-emerald-200 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-4">
                    対応すると
                  </p>
                  <div className="space-y-3">
                    {actionTimeline.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                          {i < actionTimeline.length - 1 && (
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
          )}

          {/* AI Recommendation */}
          <div className={cn('rounded-lg p-5 border', style.softClass)}>
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">
                  AIからの提案
                </p>
                <p className="text-lg font-bold text-foreground leading-relaxed max-w-prose">
                  {aiDecision}
                </p>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    この提案の理由
                  </p>
                  <p className="text-sm text-foreground leading-loose max-w-prose">{aiReason}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          {alternatives && alternatives.length > 0 && (
            <div className="pt-2">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  別の選択肢を見る（{alternatives.length}件）
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {alternatives.map((alt, i) => (
                    <Link key={i} href={alt.href} className="block">
                      <div className="rounded-md bg-muted/50 border border-border hover:border-primary/40 transition-all px-3 py-2">
                        <span className="text-sm text-foreground">{alt.label}</span>
                        {alt.effort && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({alt.effort === 'low' ? 'すぐ' : alt.effort === 'medium' ? '数日' : '1週間+'})
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Primary Action */}
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
                        <span className="font-normal text-muted-foreground">
                          （{primaryAction.purpose}）
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {(primaryAction.outcome || primaryAction.expectedTimeline) && (
                  <div className="ml-5 pl-4 border-l-2 border-primary/30">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                      実行後の見込み
                    </p>
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
