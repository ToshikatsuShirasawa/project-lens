import { ProjectMemberRole } from '@/lib/generated/prisma/client'
import { projectMemberToApiRecord } from '@/lib/project-members/serialize-project-member'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ProjectMemberRoleApi } from '@/lib/types'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

const ROLE_SET = new Set<string>(Object.values(ProjectMemberRole))

/**
 * GET /api/projects/[projectId]/members
 * project_members と users を結合して、担当者候補一覧を返す。
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const id = projectId?.trim()
    if (!id) {
      return NextResponse.json({ message: 'projectId が不正です' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    const rows = await prisma.projectMember.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })

    const members = rows.map((r) =>
      projectMemberToApiRecord({
        id: r.id,
        role: r.role as ProjectMemberRoleApi,
        user: r.user,
      })
    )

    return NextResponse.json({ members })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/members]', e)
    return NextResponse.json({ message: 'メンバー一覧の取得に失敗しました' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[projectId]/members
 * userId + role でメンバーを追加する。
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const id = projectId?.trim()
    if (!id) {
      return NextResponse.json({ message: 'projectId が不正です' }, { status: 400 })
    }

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
    const userIdRaw = raw.userId
    const roleRaw = raw.role

    const userId = typeof userIdRaw === 'string' ? userIdRaw.trim() : ''
    if (!userId) {
      return NextResponse.json({ message: 'userId が必要です' }, { status: 400 })
    }

    if (typeof roleRaw !== 'string' || !ROLE_SET.has(roleRaw)) {
      return NextResponse.json(
        { message: 'role は OWNER / ADMIN / MEMBER のいずれかとしてください' },
        { status: 400 }
      )
    }
    const role = roleRaw as ProjectMemberRole

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ message: '指定したユーザーが存在しません' }, { status: 400 })
    }

    const duplicate = await prisma.projectMember.findFirst({
      where: { projectId: id, userId },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json({ message: 'このユーザーは既にプロジェクトメンバーです' }, { status: 400 })
    }

    const created = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId,
        role,
      },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(
      projectMemberToApiRecord({
        id: created.id,
        role: created.role as ProjectMemberRoleApi,
        user: created.user,
      }),
      { status: 201 }
    )
  } catch (e) {
    console.error('[POST /api/projects/[projectId]/members]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2002') {
      return NextResponse.json({ message: 'このユーザーは既にプロジェクトメンバーです' }, { status: 400 })
    }
    return NextResponse.json({ message: 'メンバーの追加に失敗しました' }, { status: 500 })
  }
}
