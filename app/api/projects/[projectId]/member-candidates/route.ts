import { NextResponse } from 'next/server'
import { requireProjectManagerJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import type { ProjectMemberUserCandidatesResponse } from '@/lib/types'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/member-candidates
 * 同じ workspace（organization）に所属し、まだ当該 project のメンバーでないユーザーのみ。
 * メンバー管理の「既存ユーザーを追加」用。管理権限必須。
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId: projectIdRaw } = await context.params
    const access = await requireProjectManagerJson(projectIdRaw)
    if (!access.ok) return access.response

    const projectId = access.ctx.project.id
    const orgId = access.ctx.project.organizationId

    const users = await prisma.user.findMany({
      where: {
        organizationMembers: { some: { organizationId: orgId } },
        memberships: { none: { projectId } },
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json({ users } satisfies ProjectMemberUserCandidatesResponse)
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/member-candidates]', e)
    return NextResponse.json({ message: '候補ユーザーの取得に失敗しました' }, { status: 500 })
  }
}
