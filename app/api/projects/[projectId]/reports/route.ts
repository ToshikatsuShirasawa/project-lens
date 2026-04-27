import { NextResponse } from 'next/server'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import type { WorkReportApiRecord, WorkReportCreateRequest } from '@/lib/types'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

function serializeReport(row: {
  id: string
  projectId: string
  submittedByUserId: string | null
  submittedBy: string
  completed: string
  inProgress: string
  blockers: string
  nextActions: string
  reportDate: Date
  createdAt: Date
  updatedAt: Date
}): WorkReportApiRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    submittedByUserId: row.submittedByUserId,
    submittedBy: row.submittedBy,
    completed: row.completed,
    inProgress: row.inProgress,
    blockers: row.blockers,
    nextActions: row.nextActions,
    reportDate: row.reportDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * GET /api/projects/[projectId]/reports
 * 最新 50 件の作業報告を返す。MEMBER 以上で閲覧可。
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    const rows = await prisma.workReport.findMany({
      where: { projectId: access.ctx.project.id },
      orderBy: { reportDate: 'desc' },
      take: 50,
      select: {
        id: true,
        projectId: true,
        submittedByUserId: true,
        submittedBy: true,
        completed: true,
        inProgress: true,
        blockers: true,
        nextActions: true,
        reportDate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ reports: rows.map(serializeReport) })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/reports]', e)
    return NextResponse.json({ message: '作業報告の取得に失敗しました' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[projectId]/reports
 * 作業報告を作成する。MEMBER 以上で投稿可。
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const raw = body as WorkReportCreateRequest
    const completed = typeof raw.completed === 'string' ? raw.completed.trim() : ''
    const inProgress = typeof raw.inProgress === 'string' ? raw.inProgress.trim() : ''
    const blockers = typeof raw.blockers === 'string' ? raw.blockers.trim() : ''
    const nextActions = typeof raw.nextActions === 'string' ? raw.nextActions.trim() : ''

    if (!completed && !inProgress && !blockers && !nextActions) {
      return NextResponse.json({ message: '少なくとも1つのフィールドを入力してください' }, { status: 400 })
    }

    const reportDate =
      typeof raw.reportDate === 'string' && raw.reportDate.trim()
        ? new Date(raw.reportDate.trim())
        : new Date()

    const appUser = access.ctx.appUser
    const submittedBy = appUser.name?.trim() || appUser.email.trim()

    const created = await prisma.workReport.create({
      data: {
        projectId: access.ctx.project.id,
        submittedByUserId: appUser.id,
        submittedBy,
        completed,
        inProgress,
        blockers,
        nextActions,
        reportDate,
      },
      select: {
        id: true,
        projectId: true,
        submittedByUserId: true,
        submittedBy: true,
        completed: true,
        inProgress: true,
        blockers: true,
        nextActions: true,
        reportDate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(serializeReport(created), { status: 201 })
  } catch (e) {
    console.error('[POST /api/projects/[projectId]/reports]', e)
    return NextResponse.json({ message: '作業報告の保存に失敗しました' }, { status: 500 })
  }
}
