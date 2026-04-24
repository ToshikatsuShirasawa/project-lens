import { AiTaskCandidateEventType } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma/client'

const EVENT_FROM_API: Record<string, AiTaskCandidateEventType> = {
  shown: AiTaskCandidateEventType.SHOWN,
  accepted: AiTaskCandidateEventType.ACCEPTED,
  snoozed: AiTaskCandidateEventType.SNOOZED,
  dismissed: AiTaskCandidateEventType.DISMISSED,
}

function parseStructuredReasons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

function parseMetadata(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined
  return raw as Prisma.InputJsonValue
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const projectId = typeof raw.projectId === 'string' ? raw.projectId.trim() : ''
    const candidateId = typeof raw.candidateId === 'string' ? raw.candidateId.trim() : ''
    const eventTypeRaw = typeof raw.eventType === 'string' ? raw.eventType.trim().toLowerCase() : ''
    const candidateTitle = typeof raw.candidateTitle === 'string' ? raw.candidateTitle.trim() : ''
    const candidateSource = typeof raw.candidateSource === 'string' ? raw.candidateSource.trim() : ''
    const confidenceLevel = typeof raw.confidenceLevel === 'string' ? raw.confidenceLevel.trim() : ''

    if (!projectId || !candidateId || !eventTypeRaw) {
      return NextResponse.json({ message: 'projectId, candidateId, eventType は必須です' }, { status: 400 })
    }
    if (!candidateTitle) {
      return NextResponse.json({ message: 'candidateTitle が必要です' }, { status: 400 })
    }
    if (!candidateSource) {
      return NextResponse.json({ message: 'candidateSource が必要です' }, { status: 400 })
    }
    if (!confidenceLevel) {
      return NextResponse.json({ message: 'confidenceLevel が必要です' }, { status: 400 })
    }

    const eventType = EVENT_FROM_API[eventTypeRaw]
    if (!eventType) {
      return NextResponse.json({ message: 'eventType が不正です' }, { status: 400 })
    }

    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    let recommendationReason: string | null = null
    if (raw.recommendationReason !== undefined && raw.recommendationReason !== null) {
      if (typeof raw.recommendationReason !== 'string') {
        return NextResponse.json({ message: 'recommendationReason の型が不正です' }, { status: 400 })
      }
      const t = raw.recommendationReason.trim()
      recommendationReason = t.length > 0 ? t : null
    }

    const structuredReasons = parseStructuredReasons(raw.structuredReasons)
    const structuredReasonsJson = structuredReasons as unknown as Prisma.InputJsonValue

    let createdTaskId: string | null = null
    if (raw.createdTaskId !== undefined && raw.createdTaskId !== null) {
      if (typeof raw.createdTaskId !== 'string') {
        return NextResponse.json({ message: 'createdTaskId の型が不正です' }, { status: 400 })
      }
      const t = raw.createdTaskId.trim()
      createdTaskId = t.length > 0 ? t : null
    }

    const metadataJson = parseMetadata(raw.metadata)

    await prisma.aiTaskCandidateEvent.create({
      data: {
        projectId,
        candidateId,
        eventType,
        candidateTitle,
        candidateSource,
        confidenceLevel,
        recommendationReason,
        structuredReasonsJson,
        createdTaskId,
        userId: access.ctx.appUser.id,
        organizationId: access.ctx.project.organizationId,
        metadataJson: metadataJson ?? undefined,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/ai-task-candidate-events]', e)
    return NextResponse.json({ message: 'ログの保存に失敗しました' }, { status: 500 })
  }
}
