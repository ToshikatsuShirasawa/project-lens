'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, AlertTriangle, ArrowRight, Brain } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/lib/types'

interface StatusSummaryCardProps {
  data: ProjectStatus
}

const sourceLabel = { slack: 'Slack', report: '作業報告', meeting: '議事録', ai: 'AI検出' }

export function StatusSummaryCard({ data }: StatusSummaryCardProps) {
  const {
    summary,
    progress,
    bottleneck,
    bottleneckSource,
    bottleneckDelayDays,
    nextAction,
    overallUrgency,
    daysUntilMilestone,
    aiRecommendation,
    aiRecommendationReason,
    actions,
  } = data

  const urgencyBorderClass =
    overallUrgency === 'critical'
      ? 'border-orange-200'
      : overallUrgency === 'warning'
      ? 'border-amber-200'
      : 'border-border'

  return (
    <Card className={cn('bg-card', urgencyBorderClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            現在の状況
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              overallUrgency === 'warning' && 'text-amber-600 border-amber-300',
              overallUrgency === 'critical' && 'text-orange-600 border-orange-300'
            )}
          >
            マイルストーンまで残り{daysUntilMilestone}日
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>全体進捗</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Summary text */}
        <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>

        {/* Bottleneck */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-amber-700">ボトルネック</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300">
                  {sourceLabel[bottleneckSource]}
                </Badge>
                {bottleneckDelayDays && (
                  <span className="text-[10px] text-amber-600">{bottleneckDelayDays}日遅延</span>
                )}
              </div>
              <p className="text-xs text-foreground leading-relaxed">{bottleneck}</p>
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary mb-0.5">{aiRecommendation}</p>
              <p className="text-xs text-muted-foreground">{aiRecommendationReason}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.map((action, i) => (
            <Link key={i} href={action.href}>
              <Button
                size="sm"
                variant={action.isRecommended ? 'default' : 'outline'}
                className="gap-1.5 text-xs h-8"
              >
                {action.label}
                {action.isRecommended && <ArrowRight className="h-3 w-3" />}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
