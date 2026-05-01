import { NextResponse } from 'next/server'
import {
  AiTaskCandidateSource,
  AiTaskCandidateStatus,
} from '@/lib/generated/prisma/client'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

const STATUS_FROM_API: Record<string, AiTaskCandidateStatus> = {
  HELD: AiTaskCandidateStatus.HELD,
  DISMISSED: AiTaskCandidateStatus.DISMISSED,
  ADDED: AiTaskCandidateStatus.ADDED,
}

const SOURCE_TYPE_FROM_API: Record<string, AiTaskCandidateSource> = {
  WORK_REPORT: AiTaskCandidateSource.WORK_REPORT,
  SLACK: AiTaskCandidateSource.SLACK,
  MEETING: AiTaskCandidateSource.MEETING,
  MEMO: AiTaskCandidateSource.MEMO,
}

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params
  const access = await requireProjectAccessJson(projectId)
  if (!access.ok) return access.response

  try {
    const states = await prisma.aiTaskCandidateState.findMany({
      where: { projectId },
      select: { candidateKey: true, status: true, createdTaskId: true },
    })
    return NextResponse.json({ states })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/task-candidate-states]', e)
    return NextResponse.json({ message: '状態の取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params

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
  const candidateKey = typeof raw.candidateKey === 'string' ? raw.candidateKey.trim() : ''
  const candidateTitle = typeof raw.candidateTitle === 'string' ? raw.candidateTitle.trim() : ''
  const statusRaw = typeof raw.status === 'string' ? raw.status.trim().toUpperCase() : ''
  const sourceTypeRaw = typeof raw.sourceType === 'string' ? raw.sourceType.trim().toUpperCase() : ''

  if (!candidateKey || !candidateTitle || !statusRaw) {
    return NextResponse.json(
      { message: 'candidateKey, candidateTitle, status は必須です' },
      { status: 400 }
    )
  }

  const status = STATUS_FROM_API[statusRaw]
  if (!status) {
    return NextResponse.json({ message: 'status が不正です' }, { status: 400 })
  }
  const sourceType = SOURCE_TYPE_FROM_API[sourceTypeRaw] ?? AiTaskCandidateSource.WORK_REPORT

  let createdTaskId: string | null = null
  if (raw.createdTaskId !== undefined && raw.createdTaskId !== null) {
    if (typeof raw.createdTaskId !== 'string') {
      return NextResponse.json({ message: 'createdTaskId の型が不正です' }, { status: 400 })
    }
    const t = raw.createdTaskId.trim()
    createdTaskId = t.length > 0 ? t : null
  }

  const access = await requireProjectAccessJson(projectId)
  if (!access.ok) return access.response

  try {
    await prisma.aiTaskCandidateState.upsert({
      where: { projectId_candidateKey: { projectId, candidateKey } },
      create: {
        projectId,
        candidateKey,
        candidateTitle,
        status,
        sourceType,
        createdTaskId,
        updatedByUserId: access.ctx.appUser.id,
      },
      update: {
        candidateTitle,
        status,
        createdTaskId,
        updatedByUserId: access.ctx.appUser.id,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/projects/[projectId]/task-candidate-states]', e)
    return NextResponse.json({ message: '状態の保存に失敗しました' }, { status: 500 })
  }
}
