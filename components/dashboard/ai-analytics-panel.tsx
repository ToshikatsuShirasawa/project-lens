'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CandidateRow {
  candidateTitle: string
  shownCount: number
  acceptedCount: number
  dismissedCount: number
  acceptanceRate: number
}

interface ScoreBand {
  confidenceLevel: string
  band: string
  acceptedCount: number
  dismissedCount: number
}

interface AnalyticsData {
  candidates: CandidateRow[]
  scoreBands: ScoreBand[]
  totalShown: number
  totalAccepted: number
  totalDismissed: number
  overallAcceptanceRate: number
}

const CONFIDENCE_BADGE: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  review: 'bg-muted text-muted-foreground',
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

interface AiAnalyticsPanelProps {
  projectId: string
}

export function AiAnalyticsPanel({ projectId }: AiAnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/ai-task-candidates/analytics?projectId=${encodeURIComponent(projectId)}`
        )
        const body: unknown = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          const msg =
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
              ? (body as { message: string }).message
              : `HTTP ${res.status}`
          throw new Error(msg)
        }
        setData(body as AnalyticsData)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (loading) {
    return <p className="text-sm text-muted-foreground">AI候補分析を読み込み中…</p>
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )
  }
  if (!data || data.totalShown === 0) {
    return (
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="px-4 py-8 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">まだ分析データがありません。</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            AI候補を確認・採用すると集計が始まります。
          </p>
        </CardContent>
      </Card>
    )
  }

  const topAccepted = [...data.candidates]
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate || b.acceptedCount - a.acceptedCount)
    .filter((c) => c.acceptedCount > 0)
    .slice(0, 5)

  const topDismissed = [...data.candidates]
    .sort((a, b) => b.dismissedCount - a.dismissedCount)
    .filter((c) => c.dismissedCount > 0)
    .slice(0, 5)

  return (
    <div className="space-y-4">
      {/* 全体サマリ */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: '表示', value: String(data.totalShown) },
          { label: '採用', value: String(data.totalAccepted) },
          { label: '却下', value: String(data.totalDismissed) },
          { label: '採用率', value: pct(data.overallAcceptanceRate) },
        ].map(({ label, value }) => (
          <Card key={label} className="border-border/80 bg-card shadow-none overflow-hidden rounded-xl py-0 gap-0">
            <CardHeader className="p-3 pb-0">
              <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 採用率上位 / 却下数上位 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader className="px-4 py-3 border-b border-border/80">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              採用率 上位
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topAccepted.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">採用データがありません</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">候補タイトル</th>
                    <th className="px-2 py-2 text-right font-medium w-10">採用</th>
                    <th className="px-2 py-2 text-right font-medium w-14">採用率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {topAccepted.map((row) => (
                    <tr key={row.candidateTitle} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <span className="line-clamp-2 leading-snug">{row.candidateTitle}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{row.acceptedCount}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-medium text-emerald-700">
                        {pct(row.acceptanceRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader className="px-4 py-3 border-b border-border/80">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              却下数 上位
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topDismissed.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">却下データがありません</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">候補タイトル</th>
                    <th className="px-2 py-2 text-right font-medium w-10">却下</th>
                    <th className="px-2 py-2 text-right font-medium w-10">表示</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {topDismissed.map((row) => (
                    <tr key={row.candidateTitle} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <span className="line-clamp-2 leading-snug">{row.candidateTitle}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-rose-600">
                        {row.dismissedCount}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.shownCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* スコア帯別分布 */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="px-4 py-3 border-b border-border/80">
          <CardTitle className="text-sm font-semibold">スコア帯別 採用 / 却下</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">スコア帯</th>
                <th className="px-2 py-2 text-right font-medium w-14">採用</th>
                <th className="px-2 py-2 text-right font-medium w-14">却下</th>
                <th className="px-2 py-2 text-right font-medium w-16">採用率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.scoreBands.map((band) => {
                const total = band.acceptedCount + band.dismissedCount
                const rate = total > 0 ? band.acceptedCount / total : 0
                return (
                  <tr key={band.confidenceLevel} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <Badge
                        className={cn(
                          'text-[10px] h-5 px-2 border-0',
                          CONFIDENCE_BADGE[band.confidenceLevel] ?? 'bg-muted text-muted-foreground'
                        )}
                      >
                        {band.band}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-emerald-700">
                      {band.acceptedCount}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-rose-600">
                      {band.dismissedCount}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-medium">
                      {total > 0 ? pct(rate) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
