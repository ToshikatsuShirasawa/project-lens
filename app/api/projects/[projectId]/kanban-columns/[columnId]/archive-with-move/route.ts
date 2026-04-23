import { NextResponse } from 'next/server'
import { requireProjectManagerJson } from '@/lib/auth/require-project-access'
import { serializeProjectKanbanColumn } from '@/lib/kanban/serialize-kanban-column'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ projectId: string; columnId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId, columnId } = await context.params
    const access = await requireProjectManagerJson(projectId)
    if (!access.ok) return access.response
    const projectIdStr = access.ctx.project.id
    const sourceColumnIdStr = columnId?.trim()
    if (!sourceColumnIdStr) {
      return NextResponse.json({ message: 'columnId が不正です' }, { status: 400 })
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

    const targetRaw = (body as Record<string, unknown>).targetColumnId
    if (typeof targetRaw !== 'string') {
      return NextResponse.json({ message: 'targetColumnId が必要です' }, { status: 400 })
    }
    const targetColumnIdStr = targetRaw.trim()
    if (!targetColumnIdStr) {
      return NextResponse.json({ message: 'targetColumnId が空です' }, { status: 400 })
    }

    if (sourceColumnIdStr === targetColumnIdStr) {
      return NextResponse.json({ message: '移動元と移動先を同じ列にはできません' }, { status: 400 })
    }

    const source = await prisma.projectKanbanColumn.findFirst({
      where: { id: sourceColumnIdStr, projectId: projectIdStr },
    })
    if (!source) {
      return NextResponse.json({ message: '移動元の列が見つかりません' }, { status: 404 })
    }
    if (source.isArchived) {
      return NextResponse.json({ message: '移動元の列はすでに無効です' }, { status: 400 })
    }

    const target = await prisma.projectKanbanColumn.findFirst({
      where: { id: targetColumnIdStr, projectId: projectIdStr },
    })
    if (!target) {
      return NextResponse.json({ message: '移動先の列が見つかりません' }, { status: 404 })
    }
    if (target.isArchived) {
      return NextResponse.json({ message: '移動先の列は有効な列を選んでください' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const tasks = await tx.kanbanTask.findMany({
        where: { projectId: projectIdStr, columnId: sourceColumnIdStr },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })

      const agg = await tx.kanbanTask.aggregate({
        where: { projectId: projectIdStr, columnId: targetColumnIdStr },
        _max: { sortOrder: true },
      })
      let nextSort = (agg._max.sortOrder ?? -1) + 1

      for (const t of tasks) {
        await tx.kanbanTask.update({
          where: { id: t.id },
          data: { columnId: targetColumnIdStr, sortOrder: nextSort },
        })
        nextSort += 1
      }

      const archived = await tx.projectKanbanColumn.update({
        where: { id: sourceColumnIdStr },
        data: { isArchived: true },
      })

      return { archived, movedTaskCount: tasks.length }
    })

    return NextResponse.json({
      sourceColumn: serializeProjectKanbanColumn(result.archived),
      movedTaskCount: result.movedTaskCount,
    })
  } catch (e: unknown) {
    console.error('[POST .../kanban-columns/[columnId]/archive-with-move]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: '列またはタスクが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: '移動と無効化に失敗しました' }, { status: 500 })
  }
}
