import { NextResponse } from 'next/server'
import { requireProjectAccessJson, requireProjectManagerJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import type { ProjectMemberRoleApi, ProjectUpdateRequest } from '@/lib/types'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

function serializeProject(
  row: {
    id: string
    organizationId: string
    name: string
    description: string | null
    createdAt: Date
    updatedAt: Date
  },
  myProjectRole: ProjectMemberRoleApi
) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    myProjectRole,
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    return NextResponse.json(
      serializeProject(access.ctx.project, access.ctx.projectMember.role as ProjectMemberRoleApi)
    )
  } catch (e) {
    console.error('[GET /api/projects/[projectId]]', e)
    return NextResponse.json({ message: 'プロジェクトの取得に失敗しました' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectManagerJson(projectId)
    if (!access.ok) return access.response
    const id = access.ctx.project.id

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const patch = body as ProjectUpdateRequest
    const data: { name?: string; description?: string | null } = {}

    if ('name' in patch) {
      if (typeof patch.name !== 'string' || !patch.name.trim()) {
        return NextResponse.json({ message: 'name が不正です' }, { status: 400 })
      }
      data.name = patch.name.trim()
    }

    if ('description' in patch) {
      if (patch.description !== null && typeof patch.description !== 'string') {
        return NextResponse.json({ message: 'description の型が不正です' }, { status: 400 })
      }
      if (patch.description === null) {
        data.description = null
      } else {
        const d = (patch.description as string).trim()
        data.description = d.length > 0 ? d : null
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: '更新フィールドが指定されていません' }, { status: 400 })
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      serializeProject(updated, access.ctx.projectMember.role as ProjectMemberRoleApi)
    )
  } catch (e: unknown) {
    console.error('[PATCH /api/projects/[projectId]]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: 'プロジェクトの更新に失敗しました' }, { status: 500 })
  }
}
