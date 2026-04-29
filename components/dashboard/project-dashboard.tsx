'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LayoutGrid } from 'lucide-react'
import type { ProjectDashboardResponse } from '@/lib/types'
import { AiAnalyticsPanel } from '@/components/dashboard/ai-analytics-panel'
import { TopPriorityCard } from '@/components/dashboard/top-priority-card'
import { ProjectStatusCard } from '@/components/dashboard/project-status-card'
import { IssuesRisksCard } from '@/components/dashboard/issues-risks-card'
import { DashboardTaskCandidatesCard } from '@/components/dashboard/dashboard-task-candidates-card'
import { RecentActivityCard } from '@/components/dashboard/recent-activity-card'

// ── helpers ────────────────────────────────────────────────────────────────────

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

// ── types ──────────────────────────────────────────────────────────────────────

interface AnalyticsSummary {
  totalShown: number
  totalAccepted: number
  totalDismissed: number
  overallAcceptanceRate: number
}

interface ProjectDashboardProps {
  projectId: string
}

// ── component ──────────────────────────────────────────────────────────────────

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [data, setData] = useState<ProjectDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

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

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `/api/ai-task-candidates/analytics?projectId=${encodeURIComponent(projectId)}`
        )
        const body: unknown = await res.json().catch(() => null)
        if (res.ok && body && typeof body === 'object' && 'totalShown' in body) {
          const b = body as AnalyticsSummary
          setAnalytics({
            totalShown: b.totalShown,
            totalAccepted: b.totalAccepted,
            totalDismissed: b.totalDismissed,
            overallAcceptanceRate: b.overallAcceptanceRate,
          })
        }
      } catch {
        // analytics is supplemental — silent fail
      }
    })()
  }, [projectId])

  const s = data?.summary
  const kanbanHref = `/projects/${encodeURIComponent(projectId)}/kanban`

  const pendingAnalytics = analytics
    ? Math.max(0, analytics.totalShown - analytics.totalAccepted - analytics.totalDismissed)
    : null

  // ── urgency (shared across cards) ─────────────────────────────────────────
  const urgency = useMemo((): 'critical' | 'warning' | 'normal' => {
    if (!s) return 'normal'
    return s.overdueTasks > 0 ? 'critical' : s.upcomingTasks > 0 ? 'warning' : 'normal'
  }, [s])

  // ── TopPriorityCard props ──────────────────────────────────────────────────
  const topPriorityProps = useMemo(() => {
    if (!s) return null

    const situation =
      urgency === 'critical'
        ? `${s.overdueTasks}件のタスクが期限を超過しています`
        : urgency === 'warning'
        ? `${s.upcomingTasks}件のタスクが7日以内に期限を迎えます`
        : '期限面での緊急事項はありません'

    const contextParts: string[] = []
    if (s.overdueTasks > 0) contextParts.push(`期限超過タスクが${s.overdueTasks}件あります。`)
    if (s.upcomingTasks > 0) contextParts.push(`今後7日以内に期限を迎えるタスクが${s.upcomingTasks}件あります。`)
    if (pendingAnalytics !== null && pendingAnalytics > 0)
      contextParts.push(`AIが整理した候補が${pendingAnalytics}件あります。まず上位候補を確認してください。`)
    const context =
      contextParts.length > 0
        ? contextParts.join(' ') + ' カンバンで確認・対応してください。'
        : 'AIが整理した候補をカンバンで確認・タスク化できます。'

    const impactTimeline =
      urgency === 'critical'
        ? [
            { days: 1, description: '未対応タスクがさらに遅延します', severity: 'critical' as const },
            { days: 3, description: '関連タスクへの影響が広がります', severity: 'critical' as const },
            { days: 7, description: 'プロジェクト全体の遅延リスクが増大します', severity: 'warning' as const },
          ]
        : urgency === 'warning'
        ? [
            { days: 3, description: '期限間近のタスクが積み残しになります', severity: 'warning' as const },
            { days: 7, description: '期限超過タスクが発生します', severity: 'critical' as const },
          ]
        : []

    const actionTimeline = [
      { timing: '今日', action: 'カンバンで期限タスクを確認する', outcome: '対応が必要なタスクを把握' },
      { timing: '今日中', action: '担当者に状況確認を取る', outcome: '遅延リスクを早期に低減' },
      { timing: '今週中', action: 'バックログを整理する', outcome: '次の優先項目を明確化' },
    ]

    const aiDecision =
      urgency === 'critical'
        ? '本日中に期限超過タスクを確認し、対応方針を決める'
        : urgency === 'warning'
        ? '今週の期限タスクを優先的に対応する'
        : '期限リスクは低い状態です'

    const aiReason =
      urgency === 'critical'
        ? `期限を超過したタスクが${s.overdueTasks}件あります。早期に対応することで遅延の拡大を防げます。`
        : urgency === 'warning'
        ? `${s.upcomingTasks}件のタスクが7日以内に期限を迎えます。今週中に確認することを推奨します。`
        : 'AIが整理した候補をカンバンで確認・タスク化できます。'

    return {
      situation,
      context,
      urgency,
      delayDays: s.overdueTasks > 0 ? s.overdueTasks : undefined,
      daysUntilDeadline: s.upcomingTasks > 0 ? 7 : undefined,
      impactTimeline,
      actionTimeline,
      aiDecision,
      aiReason,
      alternatives: [
        { label: 'バックログに追加する', effort: 'low' as const, impact: 'medium' as const, href: kanbanHref },
        { label: '担当者を変更する', effort: 'medium' as const, impact: 'medium' as const, href: kanbanHref },
        { label: '期限を延長する', effort: 'low' as const, impact: 'low' as const, href: kanbanHref },
      ],
      primaryAction: {
        label: 'カンバンで確認する',
        href: kanbanHref,
        purpose: '状況を把握する',
        outcome: '対応が必要なタスクを特定し、優先順位をつける',
        expectedTimeline: '本日中に確認・対応完了',
      },
    }
  }, [s, urgency, pendingAnalytics, kanbanHref])

  // ── ProjectStatusCard props ────────────────────────────────────────────────
  const statusCardProps = useMemo(() => {
    if (!s) return null

    const progress = s.totalTasks > 0 ? Math.round((s.doneTasks / s.totalTasks) * 100) : 0

    const summary =
      urgency === 'critical'
        ? `期限超過タスクが${s.overdueTasks}件あります。早急な対応が必要です。`
        : urgency === 'warning'
        ? `${s.upcomingTasks}件のタスクが7日以内に期限を迎えます。進捗を確認してください。`
        : `全体の進捗は${progress}%です。現時点で緊急の課題はありません。`

    const bottleneck =
      s.overdueTasks > 0
        ? `${s.overdueTasks}件のタスクが期限を超過しており、プロジェクト全体の進行に影響を与えています。`
        : undefined

    const aiRecommendation =
      urgency === 'critical'
        ? '本日中に期限超過タスクの担当者に連絡し、対応状況を確認する'
        : urgency === 'warning'
        ? '今週の期限タスクを優先的にカンバンで確認する'
        : undefined

    const aiRecommendationReason =
      urgency === 'critical'
        ? `期限超過タスクが${s.overdueTasks}件あり、早期対応で遅延の拡大を防げます`
        : urgency === 'warning'
        ? `${s.upcomingTasks}件のタスクが7日以内に期限を迎えます`
        : undefined

    return {
      summary,
      progress,
      bottleneck,
      bottleneckSource: 'ai' as const,
      bottleneckDelayDays: s.overdueTasks > 0 ? s.overdueTasks : undefined,
      overallUrgency: urgency,
      nextAction:
        urgency !== 'normal' ? 'カンバンで期限タスクを確認し、対応方針を決める' : undefined,
      nextActionHref: kanbanHref,
      aiRecommendation,
      aiRecommendationReason,
      actions:
        urgency !== 'normal'
          ? [{ label: 'カンバンで確認', href: kanbanHref, isRecommended: true }]
          : undefined,
    }
  }, [s, urgency, kanbanHref])

  // ── IssuesRisksCard issues ─────────────────────────────────────────────────
  const issues = useMemo(() => {
    if (!s) return []
    const result: Array<{
      id: string
      title: string
      description: string
      severity: 'high' | 'medium' | 'low'
      source: 'slack' | 'report' | 'ai' | 'meeting'
      impact?: string
      urgency?: 'critical' | 'warning' | 'normal'
      delayDays?: number
      daysUntilDeadline?: number
      aiRecommendation?: string
    }> = []

    if (s.overdueTasks > 0) {
      result.push({
        id: 'overdue',
        title: `${s.overdueTasks}件のタスクが期限超過`,
        description: `期限を過ぎたタスクが${s.overdueTasks}件あります。担当者への確認と対応方針の決定が必要です。`,
        severity: 'high',
        source: 'ai',
        impact: 'プロジェクト全体の遅延につながるリスクがあります',
        urgency: 'critical',
        delayDays: s.overdueTasks,
        aiRecommendation: '本日中に担当者に連絡し、対応状況を確認してください',
      })
    }

    if (s.upcomingTasks > 0) {
      result.push({
        id: 'upcoming',
        title: `${s.upcomingTasks}件のタスクが7日以内に期限`,
        description: `今後7日以内に期限を迎えるタスクが${s.upcomingTasks}件あります。進捗を確認してください。`,
        severity: 'medium',
        source: 'ai',
        urgency: 'warning',
        daysUntilDeadline: 7,
        aiRecommendation: '今週中にカンバンで進捗を確認し、必要に応じて優先度を調整してください',
      })
    }

    if (pendingAnalytics !== null && pendingAnalytics > 0) {
      result.push({
        id: 'pending-ai',
        title: `AIが整理した候補があります（${pendingAnalytics}件）`,
        description: `まず確認すべきAI候補が${pendingAnalytics}件あります。カンバンのAI候補パネルから上位候補を確認・タスク化してください。`,
        severity: 'low',
        source: 'ai',
        urgency: 'normal',
        aiRecommendation: 'カンバンのAI候補パネルで上位候補を確認し、必要なものをタスクに追加してください',
      })
    }

    return result
  }, [s, pendingAnalytics])

  // ── RecentActivityCard activities ─────────────────────────────────────────
  const recentActivities = useMemo(() => {
    if (!data?.recentTasks) return []
    return data.recentTasks.map((t) => {
      const who = assigneeLabel(t.assignee)
      return {
        id: t.id,
        type: 'kanban' as const,
        title: `「${t.title}」が更新されました`,
        description: t.columnName,
        user: who ? { name: who } : undefined,
        timestamp: formatDateTime(t.updatedAt),
      }
    })
  }, [data?.recentTasks])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── ヘッダー ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ダッシュボード</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            今日の確認事項と、プロジェクトの現状をまとめています。
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2 self-start" asChild>
          <Link href={kanbanHref}>
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

      {!loading && !error && s && data && topPriorityProps && statusCardProps && (
        <>
          {/* ── 1. TopPriorityCard ── */}
          <TopPriorityCard {...topPriorityProps} />

          {/* ── 2. 3カラムグリッド ── */}
          <div className="grid gap-6 lg:grid-cols-3">
            <ProjectStatusCard {...statusCardProps} />
            <IssuesRisksCard issues={issues} />
            <DashboardTaskCandidatesCard projectId={projectId} />
          </div>

          {/* ── 3. 2カラムグリッド ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AiAnalyticsPanel projectId={projectId} />
            <RecentActivityCard activities={recentActivities} />
          </div>
        </>
      )}
    </div>
  )
}
