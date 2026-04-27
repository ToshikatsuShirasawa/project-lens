'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileText, Clock, Loader2, RefreshCw } from 'lucide-react'
import type { WorkReportApiRecord, WorkReportListResponse } from '@/lib/types'

interface RecentReportsPanelProps {
  projectId: string
}

export function RecentReportsPanel({ projectId }: RecentReportsPanelProps) {
  const [reports, setReports] = useState<WorkReportApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reports`)
      if (!res.ok) {
        setError('作業報告の取得に失敗しました')
        return
      }
      const body: WorkReportListResponse = await res.json()
      setReports(body.reports ?? [])
    } catch {
      setError('作業報告の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string }>).detail
      if (!detail?.projectId || detail.projectId === projectId) {
        void fetchReports()
      }
    }
    window.addEventListener('projectlens:reports-updated', handler)
    return () => window.removeEventListener('projectlens:reports-updated', handler)
  }, [projectId, fetchReports])

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          最近の作業報告
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
          {!loading && error && (
            <button
              onClick={() => void fetchReports()}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              aria-label="再読み込み"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : error ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{error}</div>
        ) : reports.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            まだ作業報告がありません
          </div>
        ) : (
          reports.map((report) => {
            const date = new Date(report.reportDate)
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
          })
        )}
      </CardContent>
    </Card>
  )
}
