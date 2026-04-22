import { ProjectMemberRole } from '@/lib/generated/prisma/client'
import { projectMemberToApiRecord } from '@/lib/project-members/serialize-project-member'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ProjectMemberRoleApi } from '@/lib/types'

interface RouteContext {
  params: Promise<{ projectId: string; memberId: string }>
}

const ROLE_SET = new Set<string>(Object.values(ProjectMemberRole))

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId, memberId } = await context.params
    const pid = projectId?.trim()
    const mid = memberId?.trim()
    if (!pid || !mid) {
      return NextResponse.json({ message: 'projectId または memberId が不正です' }, { status: 400 })
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

    const roleRaw = (body as Record<string, unknown>).role
    if (typeof roleRaw !== 'string' || !ROLE_SET.has(roleRaw)) {
      return NextResponse.json(
        { message: 'role は OWNER / ADMIN / MEMBER のいずれかとしてください' },
        { status: 400 }
      )
    }
    const role = roleRaw as ProjectMemberRole

    const existing = await prisma.projectMember.findFirst({
      where: { id: mid, projectId: pid },
      select: { id: true, role: true },
    })
    if (!existing) {
      return NextResponse.json({ message: 'メンバーが見つかりません' }, { status: 404 })
    }

    if (existing.role === ProjectMemberRole.OWNER && role !== ProjectMemberRole.OWNER) {
      const ownerCount = await prisma.projectMember.count({
        where: { projectId: pid, role: ProjectMemberRole.OWNER },
      })
      if (ownerCount <= 1) {
        return NextResponse.json(
          { message: '最後のオーナーのロールは変更できません' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.projectMember.update({
      where: { id: mid },
      data: { role },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(
      projectMemberToApiRecord({
        id: updated.id,
        role: updated.role as ProjectMemberRoleApi,
        user: updated.user,
      })
    )
  } catch (e: unknown) {
    console.error('[PATCH /api/projects/[projectId]/members/[memberId]]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: 'メンバーが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: 'メンバーの更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { projectId, memberId } = await context.params
    const pid = projectId?.trim()
    const mid = memberId?.trim()
    if (!pid || !mid) {
      return NextResponse.json({ message: 'projectId または memberId が不正です' }, { status: 400 })
    }

    const existing = await prisma.projectMember.findFirst({
      where: { id: mid, projectId: pid },
      select: { id: true, role: true },
    })
    if (!existing) {
      return NextResponse.json({ message: 'メンバーが見つかりません' }, { status: 404 })
    }

    if (existing.role === ProjectMemberRole.OWNER) {
      const ownerCount = await prisma.projectMember.count({
        where: { projectId: pid, role: ProjectMemberRole.OWNER },
      })
      if (ownerCount <= 1) {
        return NextResponse.json(
          { message: '最後のオーナーは削除できません' },
          { status: 400 }
        )
      }
    }

    await prisma.projectMember.delete({
      where: { id: mid },
    })

    return NextResponse.json({ deleted: true, id: mid })
  } catch (e: unknown) {
    console.error('[DELETE /api/projects/[projectId]/members/[memberId]]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: 'メンバーが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: 'メンバーの削除に失敗しました' }, { status: 500 })
  }
}
