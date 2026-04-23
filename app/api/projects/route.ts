import { ProjectMemberRole } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { projectListWhereForUser } from '@/lib/auth/authorization-policy'
import { requireAppUserJson } from '@/lib/auth/require-app-user'
import {
  DEFAULT_KANBAN_TEMPLATE_KEY,
  getKanbanColumnSeedsForTemplate,
  isKanbanTemplateKey,
} from '@/lib/kanban/kanban-column-templates'
import { ensureOrganizationForCurrentUser } from '@/lib/organization/ensure-organization-for-user'
import {
  assertProjectCreationAllowed,
  isThrownProjectCountLimitError,
  projectCountLimitErrorMessage,
} from '@/lib/organization/project-limit'
import { prisma } from '@/lib/prisma'
import type { KanbanTemplateKey } from '@/lib/types'
import type { Prisma } from '@/lib/generated/prisma/client'

export async function GET(request: Request) {
  try {
    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response
    const uid = auth.ctx.appUser.id
    const orgQ = new URL(request.url).searchParams.get('organizationId')?.trim() ?? ''
    const base: Prisma.ProjectWhereInput = projectListWhereForUser(uid)
    const where: Prisma.ProjectWhereInput =
      orgQ.length > 0
        ? {
            AND: [base, { organizationId: orgQ }],
          }
        : base
    /** 案A: `project_members` 参加 かつ `organization_members` 所属の両方（authorization-policy） */
    const rows = await prisma.project.findMany({
      where,
      orderBy: [{ organization: { name: 'asc' } }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: { select: { name: true } },
      },
    })

    const projects = rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      organizationName: r.organization.name,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

    return NextResponse.json({ projects })
  } catch (e) {
    console.error('[GET /api/projects]', e)
    return NextResponse.json({ message: 'プロジェクト一覧の取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const { name, description, templateKey: templateKeyRaw, organizationId: orgIdInput } = body as Record<
      string,
      unknown
    >
    const nameStr = typeof name === 'string' ? name.trim() : ''
    if (!nameStr) {
      return NextResponse.json({ message: 'name が必要です' }, { status: 400 })
    }

    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response
    const ownerUserId: string = auth.ctx.appUser.id

    const trimmedTemplate =
      typeof templateKeyRaw === 'string' ? templateKeyRaw.trim() : ''
    const templateKey: KanbanTemplateKey =
      trimmedTemplate !== '' && isKanbanTemplateKey(trimmedTemplate)
        ? trimmedTemplate
        : DEFAULT_KANBAN_TEMPLATE_KEY

    let descriptionValue: string | null = null
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json({ message: 'description の型が不正です' }, { status: 400 })
      }
      const d = description.trim()
      descriptionValue = d.length > 0 ? d : null
    }

    const appUser = auth.ctx.appUser

    let orgIdFromBody: string | null = null
    if (orgIdInput !== undefined && orgIdInput !== null) {
      if (typeof orgIdInput !== 'string' || !orgIdInput.trim()) {
        return NextResponse.json({ message: 'organizationId の形式が不正です' }, { status: 400 })
      }
      orgIdFromBody = orgIdInput.trim()
    }

    const resolvedOrg = orgIdFromBody
      ? await prisma.organizationMember.findFirst({
          where: { userId: appUser.id, organizationId: orgIdFromBody },
          include: { organization: true },
        })
      : null
    if (orgIdFromBody && !resolvedOrg) {
      return NextResponse.json(
        { message: 'このワークスペースに参加していないか、存在しません' },
        { status: 403 }
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      // 明示 `organizationId` 時は当該 workspace へ。未指定は従来どおり先頭 org / legacy ensure
      const org = resolvedOrg
        ? resolvedOrg.organization
        : await ensureOrganizationForCurrentUser(
            { id: appUser.id, email: appUser.email, name: appUser.name },
            tx
          )

      await assertProjectCreationAllowed(org.id, tx)

      const project = await tx.project.create({
        data: {
          name: nameStr,
          description: descriptionValue,
          organizationId: org.id,
        },
      })
      const columnSeeds = getKanbanColumnSeedsForTemplate(templateKey)
      for (const def of columnSeeds) {
        await tx.projectKanbanColumn.create({
          data: {
            projectId: project.id,
            key: def.key,
            name: def.name,
            sortOrder: def.sortOrder,
          },
        })
      }

      let ownerMemberCreated = false
      if (ownerUserId) {
        const existing = await tx.projectMember.findFirst({
          where: { projectId: project.id, userId: ownerUserId },
          select: { id: true },
        })
        if (!existing) {
          await tx.projectMember.create({
            data: {
              projectId: project.id,
              userId: ownerUserId,
              role: ProjectMemberRole.OWNER,
            },
          })
          ownerMemberCreated = true
        }
      }

      return { project, ownerMemberCreated }
    })

    return NextResponse.json(
      {
        id: created.project.id,
        organizationId: created.project.organizationId,
        name: created.project.name,
        description: created.project.description,
        createdAt: created.project.createdAt.toISOString(),
        updatedAt: created.project.updatedAt.toISOString(),
        ...(created.ownerMemberCreated ? { ownerMemberCreated: true } : {}),
      },
      { status: 201 }
    )
  } catch (e) {
    if (isThrownProjectCountLimitError(e)) {
      return NextResponse.json({ message: projectCountLimitErrorMessage(e) }, { status: 409 })
    }
    console.error('[POST /api/projects]', e)
    return NextResponse.json({ message: 'プロジェクトの作成に失敗しました' }, { status: 500 })
  }
}
