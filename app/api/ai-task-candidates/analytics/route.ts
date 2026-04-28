import { NextResponse } from 'next/server'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import { AiTaskCandidateEventType } from '@/lib/generated/prisma/client'

const BAND_LABEL: Record<string, string> = {
  high: '高 (7〜10)',
  medium: '中 (4〜6)',
  review: '低 (0〜3)',
}
const BAND_ORDER = ['high', 'medium', 'review']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')?.trim() ?? ''

    if (!projectId) {
      return NextResponse.json({ message: 'projectId は必須です' }, { status: 400 })
    }

    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    const [eventGroups, bandGroups] = await Promise.all([
      prisma.aiTaskCandidateEvent.groupBy({
        by: ['candidateTitle', 'eventType'],
        where: { projectId },
        _count: { _all: true },
      }),
      prisma.aiTaskCandidateEvent.groupBy({
        by: ['confidenceLevel', 'eventType'],
        where: {
          projectId,
          eventType: { in: [AiTaskCandidateEventType.ACCEPTED, AiTaskCandidateEventType.DISMISSED] },
        },
        _count: { _all: true },
      }),
    ])

    // candidateTitle ごとに集計
    const byTitle = new Map<string, { shown: number; accepted: number; dismissed: number }>()
    for (const row of eventGroups) {
      const entry = byTitle.get(row.candidateTitle) ?? { shown: 0, accepted: 0, dismissed: 0 }
      if (row.eventType === AiTaskCandidateEventType.SHOWN) entry.shown += row._count._all
      else if (row.eventType === AiTaskCandidateEventType.ACCEPTED) entry.accepted += row._count._all
      else if (row.eventType === AiTaskCandidateEventType.DISMISSED) entry.dismissed += row._count._all
      byTitle.set(row.candidateTitle, entry)
    }

    const candidates = Array.from(byTitle.entries())
      .map(([candidateTitle, c]) => ({
        candidateTitle,
        shownCount: c.shown,
        acceptedCount: c.accepted,
        dismissedCount: c.dismissed,
        acceptanceRate: c.shown > 0 ? c.accepted / c.shown : 0,
      }))
      .sort((a, b) => b.acceptedCount - a.acceptedCount)

    // confidenceLevel ごとに集計
    const bandMap = new Map<string, { accepted: number; dismissed: number }>()
    for (const row of bandGroups) {
      const entry = bandMap.get(row.confidenceLevel) ?? { accepted: 0, dismissed: 0 }
      if (row.eventType === AiTaskCandidateEventType.ACCEPTED) entry.accepted += row._count._all
      else if (row.eventType === AiTaskCandidateEventType.DISMISSED) entry.dismissed += row._count._all
      bandMap.set(row.confidenceLevel, entry)
    }

    const scoreBands = BAND_ORDER.map((level) => ({
      confidenceLevel: level,
      band: BAND_LABEL[level] ?? level,
      acceptedCount: bandMap.get(level)?.accepted ?? 0,
      dismissedCount: bandMap.get(level)?.dismissed ?? 0,
    }))

    const totalShown = candidates.reduce((s, c) => s + c.shownCount, 0)
    const totalAccepted = candidates.reduce((s, c) => s + c.acceptedCount, 0)
    const totalDismissed = candidates.reduce((s, c) => s + c.dismissedCount, 0)

    return NextResponse.json({
      candidates,
      scoreBands,
      totalShown,
      totalAccepted,
      totalDismissed,
      overallAcceptanceRate: totalShown > 0 ? totalAccepted / totalShown : 0,
    })
  } catch (e) {
    console.error('[GET /api/ai-task-candidates/analytics]', e)
    return NextResponse.json({ message: '分析データの取得に失敗しました' }, { status: 500 })
  }
}
