"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { FileText, ChevronRight } from "lucide-react"

interface Report {
  id: string
  user: { name: string; avatar?: string }
  date: string
  summary: string
  issuesCount: number
  todosCount: number
}

interface ReportHistoryProps {
  reports: Report[]
  onViewReport?: (reportId: string) => void
}

export function ReportHistory({ reports, onViewReport }: ReportHistoryProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
          <FileText className="h-4 w-4 text-chart-2" />
        </div>
        <CardTitle className="text-lg">最近の作業報告</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => onViewReport?.(report.id)}
            className="flex w-full items-center gap-4 rounded-lg border border-border bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary/50"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={report.user.avatar} />
              <AvatarFallback className="bg-secondary">
                {report.user.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {report.user.name}
                </span>
                <span className="text-xs text-muted-foreground">{report.date}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{report.summary}</p>
              <div className="flex items-center gap-2 mt-1">
                {report.issuesCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    課題 {report.issuesCount}
                  </Badge>
                )}
                {report.todosCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    TODO {report.todosCount}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
