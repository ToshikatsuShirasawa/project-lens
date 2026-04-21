import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileText, Clock } from 'lucide-react'
import { mockReports } from '@/lib/mock/reports'

export function RecentReportsPanel() {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          最近の作業報告
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockReports.map((report) => {
          const date = new Date(report.submittedAt)
          const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
          return (
            <div
              key={report.id}
              className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-secondary">
                  {report.submittedBy.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{report.submittedBy}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {timeStr}
                  </span>
                </div>
                {report.completed && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {report.completed}
                  </p>
                )}
                {report.blockers && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-warning border-warning/40">
                    ブロッカーあり
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
