'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IssueRiskItem } from '@/lib/types'

interface IssueRiskPanelProps {
  issues: IssueRiskItem[]
}

const sourceLabel = {
  slack: 'Slack',
  report: '作業報告',
  meeting: '議事録',
  ai: 'AI検出',
}

const severityConfig = {
  high: { label: '高', class: 'bg-destructive/20 text-destructive' },
  medium: { label: '中', class: 'bg-warning/20 text-warning' },
  low: { label: '低', class: 'bg-muted text-muted-foreground' },
}

export function IssueRiskPanel({ issues }: IssueRiskPanelProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          課題とリスク
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.map((issue) => {
          const sev = severityConfig[issue.severity]
          return (
            <div
              key={issue.id}
              className={cn(
                'rounded-lg border p-3 space-y-2',
                issue.urgency === 'warning' ? 'border-amber-200' : 'border-border'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground leading-snug">{issue.title}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge className={cn('text-[10px] h-4 px-1.5 border-0', sev.class)}>
                    {sev.label}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {sourceLabel[issue.source]}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>
              {(issue.daysUntilDeadline || issue.aiRecommendation) && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {issue.daysUntilDeadline && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      期限まで{issue.daysUntilDeadline}日
                    </span>
                  )}
                  {issue.aiRecommendation && (
                    <span className="text-[11px] text-primary">→ {issue.aiRecommendation}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
