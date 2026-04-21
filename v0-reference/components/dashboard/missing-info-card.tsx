"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  HelpCircle,
  User,
  Calendar,
  FileQuestion,
  CheckCircle,
  GitBranch,
  MoreHorizontal,
  UserPlus,
  CalendarPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react"

type MissingType = "assignee" | "deadline" | "requirement" | "decision" | "dependency"

interface MissingItem {
  id: string
  type: MissingType
  title: string
  context?: string
  source?: "slack" | "report" | "ai" | "meeting"
}

interface MissingInfoCardProps {
  items: MissingItem[]
  onAssignPerson?: (id: string) => void
  onSetDeadline?: (id: string) => void
  onAddToKanban?: (id: string) => void
}

const typeConfig: Record<MissingType, { label: string; icon: typeof User; action: string }> = {
  assignee: { label: "担当者未定", icon: User, action: "担当者を設定" },
  deadline: { label: "期限未定", icon: Calendar, action: "期限を設定" },
  requirement: { label: "要件不明確", icon: FileQuestion, action: "詳細を追加" },
  decision: { label: "未決定事項", icon: CheckCircle, action: "決定事項を記録" },
  dependency: { label: "依存関係不明", icon: GitBranch, action: "依存関係を設定" },
}

const sourceLabels: Record<string, string> = {
  slack: "Slackから",
  report: "作業報告から",
  ai: "AI検出",
  meeting: "議事録から",
}

export function MissingInfoCard({
  items,
  onAssignPerson,
  onSetDeadline,
  onAddToKanban,
}: MissingInfoCardProps) {
  return (
    <Card className="bg-card shadow-sm border-border">
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
          <HelpCircle className="h-4 w-4 text-warning" />
        </div>
        <CardTitle className="text-base font-semibold">不足している情報</CardTitle>
        <Badge variant="secondary" className="ml-auto gap-1.5 h-6 px-2">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span>{items.length}件検出</span>
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            不足している情報はありません
          </p>
        ) : (
          items.map((item) => {
            const config = typeConfig[item.type]
            const Icon = config.icon

            return (
              <div
                key={item.id}
                className="group flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-all hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                  <Icon className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs h-6 px-2">
                      {config.label}
                    </Badge>
                    {item.source && (
                      <span className="text-xs text-muted-foreground">
                        {sourceLabels[item.source]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
                  {item.context && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.context}</p>
                  )}
                </div>

                {/* Quick Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {item.type === "assignee" && (
                      <DropdownMenuItem onClick={() => onAssignPerson?.(item.id)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        担当者を設定
                      </DropdownMenuItem>
                    )}
                    {item.type === "deadline" && (
                      <DropdownMenuItem onClick={() => onSetDeadline?.(item.id)}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        期限を設定
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onAddToKanban?.(item.id)}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      カンバンに追加
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
