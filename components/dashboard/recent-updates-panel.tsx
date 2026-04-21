'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Activity, FileText, Bot, Kanban, MessageSquare, Calendar } from 'lucide-react'
import type { TimelineEvent } from '@/lib/types'

interface RecentUpdatesPanelProps {
  activities: TimelineEvent[]
}

const typeConfig = {
  report: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  ai: { icon: Bot, color: 'text-primary', bg: 'bg-primary/10' },
  kanban: { icon: Kanban, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  slack: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50' },
  meeting: { icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50' },
}

export function RecentUpdatesPanel({ activities }: RecentUpdatesPanelProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          最近の更新
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const cfg = typeConfig[activity.type]
            const Icon = cfg.icon
            return (
              <div key={activity.id} className="flex gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{activity.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {activity.user && (
                      <span className="font-medium text-foreground">{activity.user.name}: </span>
                    )}
                    {activity.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
