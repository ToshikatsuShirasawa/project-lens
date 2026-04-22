'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LayoutGrid } from 'lucide-react'
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

function assigneeLabel(a: { name: string | null; email: string } | null): string | null {
  if (!a) return null
  const n = a.name?.trim()
  if (n) return n
  return a.email.split('@')[0] ?? a.email
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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">
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

      {!loading && !error && s && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">サマリ</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ['総タスク', s.totalTasks],
                  ['未完了', s.openTasks],
                  ['完了', s.doneTasks],
                  ['メンバー', s.memberCount],
                  ['期限切れ', s.overdueTasks],
                  ['7日以内', s.upcomingTasks],
                ] as const
              ).map(([label, value]) => (
                <Card key={label} className="bg-card">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs">{label}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">列ごとのタスク数</h2>
            <Card className="bg-card">
              <CardContent className="p-0">
                {data!.columns.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">有効な列がありません。</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data!.columns.map((c) => (
                      <li
                        key={c.columnId}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-foreground truncate">{c.columnName}</span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {c.taskCount} 件
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">最近更新したタスク</h2>
            <Card className="bg-card">
              <CardContent className="p-0">
                {data!.recentTasks.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">タスクはまだありません。</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data!.recentTasks.map((t) => (
                      <li key={t.id} className="px-4 py-3 space-y-1.5">
                        <p className="text-sm font-medium text-foreground leading-snug">{t.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{t.columnName}</span>
                          <span>·</span>
                          <span>{formatDateTime(t.updatedAt)}</span>
                          {t.dueDate && (
                            <>
                              <span>·</span>
                              <span>期限 {t.dueDate}</span>
                            </>
                          )}
                          {t.priority && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'h-5 px-1.5 text-[10px] font-normal border-0',
                                t.priority === 'HIGH' && 'bg-destructive/10 text-destructive',
                                t.priority === 'MEDIUM' && 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
                              )}
                            >
                              {priorityLabel[t.priority]}
                            </Badge>
                          )}
                          {assigneeLabel(t.assignee) && (
                            <>
                              <span>·</span>
                              <span>担当 {assigneeLabel(t.assignee)}</span>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
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
