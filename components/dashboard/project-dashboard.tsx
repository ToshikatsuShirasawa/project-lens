'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, LayoutGrid, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectDashboardResponse, TaskPriority } from '@/lib/types'

const priorityLabel: Record<TaskPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatDueShort(isoDate: string): string {
  try {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

function assigneeLabel(a: { name: string | null; email: string } | null): string | null {
  if (!a) return null
  const n = a.name?.trim()
  if (n) return n
  return a.email.split('@')[0] ?? a.email
}

function summaryMetricCardClass(kind: 'total' | 'open' | 'done' | 'members' | 'overdue' | 'upcoming', value: number): string {
  const base = 'overflow-hidden rounded-xl border border-border py-0 gap-0 shadow-none'
  const muted = cn(base, 'border-l-2 border-l-border bg-card', '[&_.metric-value]:text-muted-foreground')

  if (kind === 'overdue') {
    if (value > 0) {
      return cn(
        base,
        'border-l-[3px] border-l-destructive bg-destructive/[0.06]',
        '[&_.metric-value]:text-destructive [&_.metric-value]:font-semibold'
      )
    }
    return muted
  }
  if (kind === 'upcoming') {
    if (value > 0) {
      return cn(
        base,
        'border-l-[3px] border-l-amber-500 bg-amber-500/[0.07] dark:bg-amber-500/10',
        '[&_.metric-value]:text-amber-900 dark:[&_.metric-value]:text-amber-100 [&_.metric-value]:font-semibold'
      )
    }
    return muted
  }
  if (kind === 'done') {
    if (value > 0) {
      return cn(
        base,
        'border-l-[3px] border-l-emerald-600/80 dark:border-l-emerald-500 bg-emerald-500/[0.06] dark:bg-emerald-500/10',
        '[&_.metric-value]:text-emerald-800 dark:[&_.metric-value]:text-emerald-200 [&_.metric-value]:font-semibold'
      )
    }
    return muted
  }
  return cn(base, 'border-l-2 border-l-border bg-card')
}

interface ProjectDashboardProps {
  projectId: string
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [data, setData] = useState<ProjectDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/dashboard`)
      const body: unknown = await res.json().catch(() => null)
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
      if (!body || typeof body !== 'object' || !('summary' in body)) {
        throw new Error('レスポンスが不正です')
      }
      setData(body as ProjectDashboardResponse)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const s = data?.summary

  const maxColumnTasks = useMemo(() => {
    const cols = data?.columns
    if (!cols?.length) return 1
    return Math.max(1, ...cols.map((c) => c.taskCount))
  }, [data?.columns])

  const summaryItems = s
    ? (
        [
          { kind: 'total' as const, label: '総タスク', value: s.totalTasks },
          { kind: 'open' as const, label: '未完了', value: s.openTasks },
          { kind: 'done' as const, label: '完了', value: s.doneTasks },
          { kind: 'members' as const, label: 'メンバー', value: s.memberCount },
          { kind: 'overdue' as const, label: '期限切れ', value: s.overdueTasks },
          { kind: 'upcoming' as const, label: '7日以内', value: s.upcomingTasks },
        ] as const
      )
    : []

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ダッシュボード</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            タスク数・列ごとの件数・期限まわりのざっくり把握用です。
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2 self-start" asChild>
          <Link href={`/projects/${encodeURIComponent(projectId)}/kanban`}>
            <LayoutGrid className="h-4 w-4" />
            カンバンへ
          </Link>
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">読み込み中…</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && s && data && (
        <>
          <section className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">サマリ</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {summaryItems.map(({ kind, label, value }) => (
                <Card key={label} className={summaryMetricCardClass(kind, value)}>
                  <CardHeader className="space-y-1 p-3.5 pb-3.5 pt-3.5">
                    <CardDescription className="text-[11px] font-medium leading-none text-muted-foreground">
                      {label}
                    </CardDescription>
                    <CardTitle className="metric-value text-2xl tabular-nums leading-none">{value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">列ごとのタスク数</h2>
            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-3 sm:p-4">
                {data.columns.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">有効な列がありません。</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {data.columns.map((c) => {
                      const ratio = c.taskCount / maxColumnTasks
                      return (
                        <div
                          key={c.columnId}
                          className="flex min-h-[4.25rem] flex-col rounded-md border border-border/80 bg-muted/15 px-2.5 py-2"
                        >
                          <div className="flex min-h-[2.25rem] items-start justify-between gap-1.5">
                            <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                              {c.columnName}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums leading-none text-foreground">
                              {c.taskCount}
                              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">件</span>
                            </span>
                          </div>
                          <div
                            className="mt-auto h-1 w-full overflow-hidden rounded-full bg-muted"
                            aria-hidden
                          >
                            <div
                              className={cn(
                                'h-full rounded-full bg-primary/60 transition-[width]',
                                c.taskCount > 0 && ratio >= 0.66 && 'bg-primary',
                                c.taskCount > 0 && ratio < 0.25 && 'bg-muted-foreground/40'
                              )}
                              style={{ width: `${Math.round(Math.max(8, ratio * 100))}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">最近更新したタスク</h2>
            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-0">
                {data.recentTasks.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">まだ更新履歴がありません。</p>
                    <p className="mt-1 text-xs text-muted-foreground/80">カンバンでタスクを動かすとここに表示されます。</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/80">
                    {data.recentTasks.map((t) => {
                      const who = assigneeLabel(t.assignee)
                      return (
                        <li key={t.id} className="px-4 py-3">
                          <p className="text-sm font-medium leading-snug text-foreground">{t.title}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <Badge variant="outline" className="h-5 max-w-[9rem] truncate px-1.5 text-[10px] font-normal">
                              {t.columnName}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              更新 {formatDateTime(t.updatedAt)}
                            </span>
                            {t.priority && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'h-5 shrink-0 px-1.5 text-[10px] font-medium',
                                  t.priority === 'HIGH' && 'border-0 bg-destructive/12 text-destructive',
                                  t.priority === 'MEDIUM' &&
                                    'border-0 bg-amber-500/12 text-amber-900 dark:text-amber-100',
                                  t.priority === 'LOW' && 'border-0 bg-muted text-muted-foreground'
                                )}
                              >
                                優先 {priorityLabel[t.priority]}
                              </Badge>
                            )}
                            {t.dueDate && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                <CalendarDays className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                期限 {formatDueShort(t.dueDate)}
                              </span>
                            )}
                            {who && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                <UserRound className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                {who}
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
