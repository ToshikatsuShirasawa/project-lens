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
import { prisma } from '@/lib/prisma'
import type { KanbanTemplateKey } from '@/lib/types'

export async function GET() {
  try {
    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response
    const uid = auth.ctx.appUser.id
    /** 案A: `project_members` 参加 かつ `organization_members` 所属の両方（authorization-policy） */
    const rows = await prisma.project.findMany({
      where: projectListWhereForUser(uid),
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
      },
    })

    const projects = rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
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

    const { name, description, templateKey: templateKeyRaw } = body as Record<string, unknown>
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

    const created = await prisma.$transaction(async (tx) => {
      const org = await ensureOrganizationForCurrentUser(
        { id: appUser.id, email: appUser.email, name: appUser.name },
        tx
      )

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
    console.error('[POST /api/projects]', e)
    return NextResponse.json({ message: 'プロジェクトの作成に失敗しました' }, { status: 500 })
  }
}
