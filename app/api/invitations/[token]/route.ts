import { ProjectInvitationStatus } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ProjectMemberRoleApi, ProjectInvitationPreviewResponse } from '@/lib/types'

interface RouteContext {
  params: Promise<{ token: string }>
}

/**
 * GET /api/invitations/[token]
 * 認証不要。トークン保持者向けの招待プレビュー（プロジェクト名・ロール等）。
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token: raw } = await context.params
    const token = raw?.trim()
    if (!token) {
      return NextResponse.json({ message: 'token が不正です' }, { status: 400 })
    }

    let inv = await prisma.projectInvitation.findUnique({
      where: { token },
      include: { project: { select: { id: true, name: true } } },
    })
    if (!inv) {
      return NextResponse.json({ message: '招待が見つかりません' }, { status: 404 })
    }

    const now = new Date()
    const pastDue =
      inv.status === ProjectInvitationStatus.PENDING && now > inv.expiresAt
    if (pastDue) {
      inv = await prisma.projectInvitation.update({
        where: { id: inv.id },
        data: { status: ProjectInvitationStatus.EXPIRED },
        include: { project: { select: { id: true, name: true } } },
      })
    }

    const payload: ProjectInvitationPreviewResponse = {
      projectId: inv.project.id,
      projectName: inv.project.name,
      email: inv.email,
      role: inv.role as ProjectMemberRoleApi,
      status: inv.status as ProjectInvitationPreviewResponse['status'],
      expiresAt: inv.expiresAt.toISOString(),
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      isPastExpiry: inv.status === ProjectInvitationStatus.EXPIRED,
    }

    return NextResponse.json(payload)
  } catch (e) {
    console.error('[GET /api/invitations/[token]]', e)
    return NextResponse.json({ message: '招待の取得に失敗しました' }, { status: 500 })
  }
}
