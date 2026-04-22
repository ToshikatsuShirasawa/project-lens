import { ProjectMemberRole } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import {
  DEFAULT_KANBAN_TEMPLATE_KEY,
  getKanbanColumnSeedsForTemplate,
  isKanbanTemplateKey,
} from '@/lib/kanban/kanban-column-templates'
import { prisma } from '@/lib/prisma'
import type { KanbanTemplateKey } from '@/lib/types'

export async function GET() {
  try {
    const rows = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const projects = rows.map((r) => ({
      id: r.id,
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

    const { name, description, templateKey: templateKeyRaw, ownerUserId: ownerUserIdRaw } = body as Record<
      string,
      unknown
    >
    const nameStr = typeof name === 'string' ? name.trim() : ''
    if (!nameStr) {
      return NextResponse.json({ message: 'name が必要です' }, { status: 400 })
    }

    let ownerUserId: string | null = null
    if ('ownerUserId' in body) {
      if (ownerUserIdRaw === null || ownerUserIdRaw === undefined) {
        ownerUserId = null
      } else if (typeof ownerUserIdRaw === 'string') {
        const trimmed = ownerUserIdRaw.trim()
        if (!trimmed) {
          return NextResponse.json(
            { message: 'ownerUserId を指定する場合は空にできません' },
            { status: 400 }
          )
        }
        ownerUserId = trimmed
      } else {
        return NextResponse.json({ message: 'ownerUserId は文字列または null としてください' }, { status: 400 })
      }
    }

    if (ownerUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: ownerUserId },
        select: { id: true },
      })
      if (!userExists) {
        return NextResponse.json(
          { message: 'ownerUserId に一致するユーザーが存在しません' },
          { status: 400 }
        )
      }
    }

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

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: nameStr,
          description: descriptionValue,
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
