"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Activity,
  FileText,
  Sparkles,
  Kanban,
  MessageSquare,
} from "lucide-react"

type ActivityType = "report" | "ai" | "kanban" | "slack"

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description?: string
  user?: { name: string; avatar?: string }
  timestamp: string
}

interface RecentActivityCardProps {
  activities: ActivityItem[]
}

const typeConfig: Record<ActivityType, { icon: typeof Activity; color: string }> = {
  report: { icon: FileText, color: "text-chart-2" },
  ai: { icon: Sparkles, color: "text-primary" },
  kanban: { icon: Kanban, color: "text-chart-3" },
  slack: { icon: MessageSquare, color: "text-chart-5" },
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  return (
    <Card className="bg-card shadow-sm border-border">
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-5/10">
          <Activity className="h-4 w-4 text-chart-5" />
        </div>
        <CardTitle className="text-base font-semibold">最近の更新</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-5">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

          {activities.map((activity, index) => {
            const config = typeConfig[activity.type]
            const Icon = config.icon

            return (
              <div key={activity.id} className="relative flex gap-4 pl-9">
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-card bg-muted-foreground/30" />

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                    <span className="text-sm font-medium text-foreground">{activity.title}</span>
                    {activity.type === "ai" && (
                      <Badge variant="secondary" className="gap-1 text-xs h-5 px-1.5">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                    {activity.user && (
                      <>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={activity.user.avatar} />
                          <AvatarFallback className="text-[8px] bg-muted">
                            {activity.user.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{activity.user.name}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{activity.timestamp}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
