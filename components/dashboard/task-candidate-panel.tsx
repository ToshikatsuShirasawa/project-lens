'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskCandidate } from '@/lib/types'

interface TaskCandidatePanelProps {
  candidates: TaskCandidate[]
}

const sourceConfig = {
  slack: { label: 'Slack', class: 'bg-emerald-100 text-emerald-700' },
  report: { label: '作業報告', class: 'bg-blue-100 text-blue-700' },
  meeting: { label: '議事録', class: 'bg-purple-100 text-purple-700' },
  ai: { label: 'AI検出', class: 'bg-primary/10 text-primary' },
}

export function TaskCandidatePanel({ candidates }: TaskCandidatePanelProps) {
  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AIが見つけたタスク候補
        </CardTitle>
        <p className="text-xs text-muted-foreground">承認するとカンバンに追加されます</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((c) => {
          const src = sourceConfig[c.source]
          return (
            <div key={c.id} className="rounded-lg border border-border bg-primary/5 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{c.title}</p>
                <Badge className={cn('text-[10px] h-4 px-1.5 border-0 shrink-0', src.class)}>
                  {src.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.reason}</p>
              {(c.suggestedAssignee || c.suggestedDueDate) && (
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  {c.suggestedAssignee && <span>担当候補: {c.suggestedAssignee}</span>}
                  {c.suggestedDueDate && <span>期限候補: {c.suggestedDueDate}</span>}
                </div>
              )}
              <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-7 mt-1">
                <Plus className="h-3 w-3" />
                カンバンに追加
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
