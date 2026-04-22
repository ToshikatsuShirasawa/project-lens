import { NextResponse } from 'next/server'
import { resolveProjectKanbanColumn } from '@/lib/kanban/resolve-kanban-column'
import { serializeKanbanTask } from '@/lib/kanban/serialize-kanban-task'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ taskId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params
    const id = taskId?.trim()
    if (!id) {
      return NextResponse.json({ message: 'taskId が不正です' }, { status: 400 })
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

    const raw = body as Record<string, unknown>
    const { projectId, column, columnKey, columnId, sortOrder: sortOrderRaw } = raw
    const projectIdStr = typeof projectId === 'string' ? projectId.trim() : ''

    if (!projectIdStr) {
      return NextResponse.json({ message: 'projectId が必要です' }, { status: 400 })
    }

    const hasColumnTarget =
      (typeof column === 'string' && column.trim() !== '') ||
      (typeof columnKey === 'string' && columnKey.trim() !== '') ||
      (typeof columnId === 'string' && columnId.trim() !== '')
    if (!hasColumnTarget) {
      return NextResponse.json(
        { message: 'column / columnKey / columnId のいずれかが必要です' },
        { status: 400 }
      )
    }

    const resolved = await resolveProjectKanbanColumn(prisma, projectIdStr, {
      columnId: typeof columnId === 'string' ? columnId : undefined,
      columnKey: typeof columnKey === 'string' ? columnKey : undefined,
      column: typeof column === 'string' ? column : undefined,
    })
    if (!resolved) {
      return NextResponse.json(
        { message: '指定した列がこのプロジェクトに存在しません' },
        { status: 400 }
      )
    }

    let nextSortOrder: number
    if (sortOrderRaw !== undefined) {
      if (typeof sortOrderRaw !== 'number' || !Number.isInteger(sortOrderRaw) || sortOrderRaw < 0) {
        return NextResponse.json({ message: 'sortOrder が不正です' }, { status: 400 })
      }
      nextSortOrder = sortOrderRaw
    } else {
      const agg = await prisma.kanbanTask.aggregate({
        where: { projectId: projectIdStr, columnId: resolved.id },
        _max: { sortOrder: true },
      })
      nextSortOrder = (agg._max.sortOrder ?? -1) + 1
    }

    const existing = await prisma.kanbanTask.findUnique({
      where: { id },
      select: { projectId: true },
    })

    if (!existing) {
      return NextResponse.json({ message: 'タスクが見つかりません' }, { status: 404 })
    }

    if (existing.projectId !== projectIdStr) {
      return NextResponse.json({ message: 'projectId が一致しません' }, { status: 400 })
    }

    const updated = await prisma.kanbanTask.update({
      where: { id },
      data: {
        columnId: resolved.id,
        sortOrder: nextSortOrder,
      },
      include: {
        assignee: { select: { name: true } },
        kanbanColumn: { select: { key: true } },
      },
    })

    return NextResponse.json(
      serializeKanbanTask({
        ...updated,
        assignee: updated.assignee ? { name: updated.assignee.name } : null,
        kanbanColumn: updated.kanbanColumn,
      })
    )
  } catch (e: unknown) {
    console.error('[PATCH /api/kanban-tasks/[taskId]]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: 'タスクが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: 'タスクの更新に失敗しました' }, { status: 500 })
  }
}
