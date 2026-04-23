import { ProjectInvitationStatus } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { requireProjectManagerJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import { projectInvitationToApiRecord } from '@/lib/project-invitations/helpers'

interface RouteContext {
  params: Promise<{ projectId: string; invitationId: string }>
}

/**
 * PATCH /api/projects/[projectId]/invitations/[invitationId]
 * body: { "status": "REVOKED" } — PENDING のみ取り消し（ADMIN/OWNER）。
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId, invitationId } = await context.params
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
    const nextStatus = (body as { status?: unknown }).status
    if (nextStatus !== 'REVOKED') {
      return NextResponse.json({ message: 'status は REVOKED のみ指定できます' }, { status: 400 })
    }

    const inv0 = await prisma.projectInvitation.findFirst({
      where: { id: invitationId, projectId: id },
    })
    if (!inv0) {
      return NextResponse.json({ message: '招待が見つかりません' }, { status: 404 })
    }
    if (inv0.status === ProjectInvitationStatus.ACCEPTED) {
      return NextResponse.json(
        { message: '受諾済みの招待は取り消せません' },
        { status: 400 }
      )
    }
    if (inv0.status !== ProjectInvitationStatus.PENDING) {
      return NextResponse.json(
        { message: '取り消せない状態の招待です' },
        { status: 400 }
      )
    }

    const updated = await prisma.projectInvitation.update({
      where: { id: inv0.id },
      data: { status: ProjectInvitationStatus.REVOKED },
    })

    return NextResponse.json({ invitation: projectInvitationToApiRecord(updated) })
  } catch (e) {
    console.error('[PATCH /api/projects/.../invitations/[invitationId]]', e)
    return NextResponse.json({ message: '招待の更新に失敗しました' }, { status: 500 })
  }
}
