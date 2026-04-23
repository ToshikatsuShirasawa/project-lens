import {
  OrganizationMemberRole,
  ProjectInvitationStatus,
} from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { requireAppUserJson } from '@/lib/auth/require-app-user'
import { prisma } from '@/lib/prisma'
import { areInvitationEmailsEqual } from '@/lib/project-invitations/helpers'
import type { ProjectInvitationAcceptResponse } from '@/lib/types'

/**
 * POST /api/invitations/accept
 * body: { "token": "…" } — ログイン済み。メール一致・PENDING・未期限切れのとき
 * `organization_members` / `project_members` へ反映し、招待を ACCEPTED。
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response
    const appUser = auth.ctx.appUser

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }
    const token = typeof (body as { token?: unknown }).token === 'string'
      ? (body as { token: string }).token.trim()
      : ''
    if (!token) {
      return NextResponse.json({ message: 'token が必要です' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.projectInvitation.findUnique({
        where: { token },
        include: { project: { select: { id: true, name: true } } },
      })
      if (!inv) {
        return { kind: 'not_found' as const }
      }

      if (inv.status === ProjectInvitationStatus.ACCEPTED) {
        return { kind: 'already_accepted' as const }
      }
      if (inv.status !== ProjectInvitationStatus.PENDING) {
        return { kind: 'invalid_state' as const, status: inv.status }
      }

      const now = new Date()
      if (now > inv.expiresAt) {
        await tx.projectInvitation.update({
          where: { id: inv.id },
          data: { status: ProjectInvitationStatus.EXPIRED },
        })
        return { kind: 'expired' as const }
      }

      if (!areInvitationEmailsEqual(appUser.email, inv.email)) {
        return { kind: 'email_mismatch' as const }
      }

      const existingPm = await tx.projectMember.findFirst({
        where: { projectId: inv.projectId, userId: appUser.id },
        select: { id: true },
      })

      if (existingPm) {
        const updated = await tx.projectInvitation.update({
          where: { id: inv.id },
          data: { status: ProjectInvitationStatus.ACCEPTED, acceptedAt: now },
        })
        return {
          kind: 'ok' as const,
          response: {
            projectId: inv.projectId,
            projectName: inv.project.name,
            invitation: {
              id: updated.id,
              status: 'ACCEPTED' as const,
              acceptedAt: updated.acceptedAt ? updated.acceptedAt.toISOString() : new Date().toISOString(),
            },
          } satisfies ProjectInvitationAcceptResponse,
        }
      }

      const orgMem = await tx.organizationMember.findFirst({
        where: { organizationId: inv.organizationId, userId: appUser.id },
        select: { id: true },
      })
      if (!orgMem) {
        await tx.organizationMember.create({
          data: {
            organizationId: inv.organizationId,
            userId: appUser.id,
            role: OrganizationMemberRole.MEMBER,
          },
        })
      }

      await tx.projectMember.create({
        data: {
          projectId: inv.projectId,
          userId: appUser.id,
          role: inv.role,
        },
      })

      const updated = await tx.projectInvitation.update({
        where: { id: inv.id },
        data: { status: ProjectInvitationStatus.ACCEPTED, acceptedAt: now },
      })

      return {
        kind: 'ok' as const,
        response: {
          projectId: inv.projectId,
          projectName: inv.project.name,
          invitation: {
            id: updated.id,
            status: 'ACCEPTED' as const,
            acceptedAt: updated.acceptedAt ? updated.acceptedAt.toISOString() : now.toISOString(),
          },
        } satisfies ProjectInvitationAcceptResponse,
      }
    })

    if (result.kind === 'not_found') {
      return NextResponse.json({ message: '招待が見つかりません' }, { status: 404 })
    }
    if (result.kind === 'already_accepted') {
      return NextResponse.json({ message: 'この招待は既に受諾済みです' }, { status: 400 })
    }
    if (result.kind === 'invalid_state') {
      return NextResponse.json(
        { message: 'この招待は受け入れできません' },
        { status: 400 }
      )
    }
    if (result.kind === 'expired') {
      return NextResponse.json({ message: '招待の有効期限が切れています' }, { status: 410 })
    }
    if (result.kind === 'email_mismatch') {
      return NextResponse.json(
        { message: 'ログイン中のメールと招待先が一致しません' },
        { status: 403 }
      )
    }
    return NextResponse.json(result.response)
  } catch (e) {
    console.error('[POST /api/invitations/accept]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2002') {
      return NextResponse.json(
        { message: '既に同じ条件で登録されている可能性があります' },
        { status: 400 }
      )
    }
    return NextResponse.json({ message: '招待の受け入れに失敗しました' }, { status: 500 })
  }
}
