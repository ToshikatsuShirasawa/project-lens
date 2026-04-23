import { NextResponse } from 'next/server'
import { requireProjectManagerJson } from '@/lib/auth/require-project-access'
import { serializeProjectKanbanColumn } from '@/lib/kanban/serialize-kanban-column'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectManagerJson(projectId)
    if (!access.ok) return access.response
    const projectIdStr = access.ctx.project.id

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const rawIds = (body as Record<string, unknown>).columnIds
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ message: 'columnIds は非空の配列である必要があります' }, { status: 400 })
    }

    const columnIds = rawIds.map((x) => (typeof x === 'string' ? x.trim() : ''))
    if (columnIds.some((id) => !id)) {
      return NextResponse.json({ message: 'columnIds の要素は空でない文字列である必要があります' }, { status: 400 })
    }
    if (new Set(columnIds).size !== columnIds.length) {
      return NextResponse.json({ message: 'columnIds に重複があります' }, { status: 400 })
    }

    const existing = await prisma.projectKanbanColumn.findMany({
      where: { projectId: projectIdStr, isArchived: false },
      select: { id: true },
    })
    const allowed = new Set(existing.map((r) => r.id))

    if (columnIds.length !== allowed.size) {
      return NextResponse.json(
        { message: 'columnIds は、このプロジェクトの有効な列 ID をすべて含む必要があります' },
        { status: 400 }
      )
    }
    for (const id of columnIds) {
      if (!allowed.has(id)) {
        return NextResponse.json({ message: '不正な列 ID が含まれています' }, { status: 400 })
      }
    }

    await prisma.$transaction(
      columnIds.map((id, sortOrder) =>
        prisma.projectKanbanColumn.update({
          where: { id },
          data: { sortOrder },
        })
      )
    )

    const updatedRows = await prisma.projectKanbanColumn.findMany({
      where: { projectId: projectIdStr, isArchived: false },
      orderBy: { sortOrder: 'asc' },
    })
    const columns = updatedRows.map(serializeProjectKanbanColumn)

    return NextResponse.json({ columns })
  } catch (e) {
    console.error('[PATCH /api/projects/[projectId]/kanban-columns/reorder]', e)
    return NextResponse.json({ message: '並び順の更新に失敗しました' }, { status: 500 })
  }
}
