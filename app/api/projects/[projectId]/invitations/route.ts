import { ProjectMemberRole, ProjectInvitationStatus } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import {
  isProjectOwnerRole,
  MSG_PROJECT_OWNER_ONLY,
  requireProjectManagerJson,
} from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import {
  buildInvitePath,
  defaultInvitationExpiresAt,
  normalizeInvitationEmail,
  projectInvitationToApiRecord,
  projectInvitationToken,
} from '@/lib/project-invitations/helpers'
interface RouteContext {
  params: Promise<{ projectId: string }>
}

const ROLE_SET = new Set<string>(Object.values(ProjectMemberRole))

/**
 * GET /api/projects/[projectId]/invitations
 * ADMIN/OWNER — 当該プロジェクトの招待一覧。
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectManagerJson(projectId)
    if (!access.ok) return access.response
    const id = access.ctx.project.id

    const rows = await prisma.projectInvitation.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      invitations: rows.map((r) => projectInvitationToApiRecord(r)),
    })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/invitations]', e)
    return NextResponse.json({ message: '招待一覧の取得に失敗しました' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[projectId]/invitations
 * ADMIN/OWNER — メール＋ロールで招待。トークンは `project_invitations.token` に格納。
 * 同じ project に PENDING がある同メール → 409。
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectManagerJson(projectId)
    if (!access.ok) return access.response
    const id = access.ctx.project.id
    const orgId = access.ctx.project.organizationId

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
    const emailRaw = raw.email
    const roleRaw = raw.role
    if (typeof emailRaw !== 'string' || !emailRaw.trim()) {
      return NextResponse.json({ message: 'email が必要です' }, { status: 400 })
    }
    if (typeof roleRaw !== 'string' || !ROLE_SET.has(roleRaw)) {
      return NextResponse.json(
        { message: 'role は OWNER / ADMIN / MEMBER のいずれかとしてください' },
        { status: 400 }
      )
    }
    const role = roleRaw as ProjectMemberRole
    const email = normalizeInvitationEmail(emailRaw)
    if (!email.includes('@')) {
      return NextResponse.json({ message: 'email の形式が不正です' }, { status: 400 })
    }

    if (role === ProjectMemberRole.OWNER && !isProjectOwnerRole(access.ctx.projectMember.role)) {
      return NextResponse.json({ message: MSG_PROJECT_OWNER_ONLY }, { status: 403 })
    }

    const pendingDup = await prisma.projectInvitation.findFirst({
      where: {
        projectId: id,
        email,
        status: ProjectInvitationStatus.PENDING,
      },
      select: { id: true },
    })
    if (pendingDup) {
      return NextResponse.json(
        { message: 'このメール向けの未処理の招待が既にあります' },
        { status: 409 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingUser) {
      const alreadyMember = await prisma.projectMember.findFirst({
        where: { projectId: id, userId: existingUser.id },
        select: { id: true },
      })
      if (alreadyMember) {
        return NextResponse.json(
          { message: 'このメールのユーザーは既にプロジェクトメンバーです' },
          { status: 400 }
        )
      }
    }

    const created = await prisma.projectInvitation.create({
      data: {
        projectId: id,
        organizationId: orgId,
        email,
        role,
        invitedByUserId: access.ctx.appUser.id,
        token: projectInvitationToken(),
        status: ProjectInvitationStatus.PENDING,
        expiresAt: defaultInvitationExpiresAt(),
      },
    })

    const inv = projectInvitationToApiRecord(created)
    const origin = new URL(request.url).origin
    const invitePath = buildInvitePath(created.token)
    const invitationUrl = `${origin}${invitePath}`

    return NextResponse.json(
      {
        invitation: inv,
        invitePath,
        invitationUrl,
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('[POST /api/projects/[projectId]/invitations]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2002') {
      return NextResponse.json({ message: '招待の作成に失敗しました（重複）' }, { status: 409 })
    }
    return NextResponse.json({ message: '招待の作成に失敗しました' }, { status: 500 })
  }
}
