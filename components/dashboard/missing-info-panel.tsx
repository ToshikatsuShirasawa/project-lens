'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MissingInfoItem } from '@/lib/types'

interface MissingInfoPanelProps {
  items: MissingInfoItem[]
}

const typeConfig = {
  assignee: { label: '担当者未定', class: 'bg-orange-100 text-orange-700' },
  deadline: { label: '期限未定', class: 'bg-amber-100 text-amber-700' },
  decision: { label: '未決定', class: 'bg-destructive/15 text-destructive' },
  requirement: { label: '要件不明', class: 'bg-purple-100 text-purple-700' },
}

const sourceLabel = { slack: 'Slackメモ', report: '作業報告', meeting: '議事録', memo: 'メモ', ai: 'AI検出' }

export function MissingInfoPanel({ items }: MissingInfoPanelProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          不足している情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const tc = typeConfig[item.type]
          return (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn('text-[10px] h-4 px-1.5 border-0', tc.class)}>
                    {tc.label}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.context}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] h-4 px-1.5">
                {sourceLabel[item.source]}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
