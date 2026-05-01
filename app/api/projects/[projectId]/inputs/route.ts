import { NextResponse } from 'next/server'
import { ProjectInputType } from '@/lib/generated/prisma/client'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import type { ProjectInputApiRecord, ProjectInputCreateRequest } from '@/lib/types'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

const INPUT_TYPE_FROM_API: Record<string, ProjectInputType> = {
  SLACK: ProjectInputType.SLACK,
  MEETING: ProjectInputType.MEETING,
  MEMO: ProjectInputType.MEMO,
}

function serializeInput(row: {
  id: string
  projectId: string
  inputType: ProjectInputType
  title: string | null
  body: string
  sourceLabel: string | null
  submittedBy: string
  submittedByUserId: string | null
  createdAt: Date
  updatedAt: Date
}): ProjectInputApiRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    inputType: row.inputType,
    title: row.title,
    body: row.body,
    sourceLabel: row.sourceLabel,
    submittedBy: row.submittedBy,
    submittedByUserId: row.submittedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    const rows = await prisma.projectInput.findMany({
      where: { projectId: access.ctx.project.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        projectId: true,
        inputType: true,
        title: true,
        body: true,
        sourceLabel: true,
        submittedBy: true,
        submittedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ inputs: rows.map(serializeInput) })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/inputs]', e)
    return NextResponse.json({ message: '自由テキスト入力の取得に失敗しました' }, { status: 500 })
  }
}

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

    const raw = body as ProjectInputCreateRequest
    const inputTypeRaw = typeof raw.inputType === 'string' ? raw.inputType.trim().toUpperCase() : 'MEETING'
    const inputType = INPUT_TYPE_FROM_API[inputTypeRaw]
    const title = typeof raw.title === 'string' ? raw.title.trim() : ''
    const inputBody = typeof raw.body === 'string' ? raw.body.trim() : ''
    const sourceLabel = typeof raw.sourceLabel === 'string' ? raw.sourceLabel.trim() : ''
    const submittedByRaw = typeof raw.submittedBy === 'string' ? raw.submittedBy.trim() : ''

    if (!inputType) {
      return NextResponse.json({ message: 'inputType が不正です' }, { status: 400 })
    }
    if (!inputBody) {
      return NextResponse.json({ message: 'body は必須です' }, { status: 400 })
    }

    const appUser = access.ctx.appUser
    const submittedBy = submittedByRaw || appUser.name?.trim() || appUser.email.trim()

    const created = await prisma.projectInput.create({
      data: {
        projectId: access.ctx.project.id,
        inputType,
        title: title || null,
        body: inputBody,
        sourceLabel: sourceLabel || null,
        submittedBy,
        submittedByUserId: appUser.id,
      },
      select: {
        id: true,
        projectId: true,
        inputType: true,
        title: true,
        body: true,
        sourceLabel: true,
        submittedBy: true,
        submittedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(serializeInput(created), { status: 201 })
  } catch (e) {
    console.error('[POST /api/projects/[projectId]/inputs]', e)
    return NextResponse.json({ message: '自由テキスト入力の保存に失敗しました' }, { status: 500 })
  }
}
