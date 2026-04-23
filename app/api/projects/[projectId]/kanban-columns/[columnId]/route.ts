import { NextResponse } from 'next/server'
import { requireProjectManagerJson } from '@/lib/auth/require-project-access'
import { serializeProjectKanbanColumn } from '@/lib/kanban/serialize-kanban-column'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ projectId: string; columnId: string }>
}

const NAME_MAX = 120

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId, columnId } = await context.params
    const access = await requireProjectManagerJson(projectId)
    if (!access.ok) return access.response
    const projectIdStr = access.ctx.project.id
    const columnIdStr = columnId?.trim()
    if (!columnIdStr) {
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

    const rec = body as Record<string, unknown>
    const nameRaw = rec.name
    const archivedRaw = rec.isArchived

    let nameTrim: string | undefined
    if (nameRaw !== undefined) {
      if (typeof nameRaw !== 'string') {
        return NextResponse.json({ message: 'name の型が不正です' }, { status: 400 })
      }
      nameTrim = nameRaw.trim()
      if (!nameTrim) {
        return NextResponse.json({ message: 'name は空にできません' }, { status: 400 })
      }
      if (nameTrim.length > NAME_MAX) {
        return NextResponse.json({ message: `name は ${NAME_MAX} 文字以内にしてください` }, { status: 400 })
      }
    }

    let isArchivedNew: boolean | undefined
    if (archivedRaw !== undefined) {
      if (typeof archivedRaw !== 'boolean') {
        return NextResponse.json({ message: 'isArchived は真偽値である必要があります' }, { status: 400 })
      }
      isArchivedNew = archivedRaw
    }

    if (nameTrim === undefined && isArchivedNew === undefined) {
      return NextResponse.json({ message: 'name または isArchived のいずれかが必要です' }, { status: 400 })
    }

    const existing = await prisma.projectKanbanColumn.findFirst({
      where: { id: columnIdStr, projectId: projectIdStr },
    })

    if (!existing) {
      return NextResponse.json({ message: '列が見つかりません' }, { status: 404 })
    }

    if (isArchivedNew === true && !existing.isArchived) {
      const taskCount = await prisma.kanbanTask.count({
        where: { projectId: projectIdStr, columnId: columnIdStr },
      })
      if (taskCount > 0) {
        return NextResponse.json(
          { message: 'この列にはタスクが残っているため無効化できません。先に別の列へ移してください。' },
          { status: 400 }
        )
      }
    }

    const data: { name?: string; isArchived?: boolean; sortOrder?: number } = {}
    if (nameTrim !== undefined) {
      data.name = nameTrim
    }
    if (isArchivedNew !== undefined) {
      data.isArchived = isArchivedNew
      if (isArchivedNew === false) {
        const agg = await prisma.projectKanbanColumn.aggregate({
          where: { projectId: projectIdStr, isArchived: false, NOT: { id: columnIdStr } },
          _max: { sortOrder: true },
        })
        data.sortOrder = (agg._max.sortOrder ?? -1) + 1
      }
    }

    const updated = await prisma.projectKanbanColumn.update({
      where: { id: columnIdStr },
      data,
    })

    return NextResponse.json(serializeProjectKanbanColumn(updated))
  } catch (e: unknown) {
    console.error('[PATCH /api/projects/[projectId]/kanban-columns/[columnId]]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: '列が見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: '列の更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { projectId, columnId } = await context.params
    const access = await requireProjectManagerJson(projectId)
    if (!access.ok) return access.response
    const projectIdStr = access.ctx.project.id
    const columnIdStr = columnId?.trim()
    if (!columnIdStr) {
      return NextResponse.json({ message: 'columnId が不正です' }, { status: 400 })
    }

    const existing = await prisma.projectKanbanColumn.findFirst({
      where: { id: columnIdStr, projectId: projectIdStr },
    })

    if (!existing) {
      return NextResponse.json({ message: '列が見つかりません' }, { status: 404 })
    }

    if (!existing.isArchived) {
      return NextResponse.json(
        { message: '有効な列は削除できません。先に無効化してください。' },
        { status: 400 }
      )
    }

    const taskCount = await prisma.kanbanTask.count({
      where: { projectId: projectIdStr, columnId: columnIdStr },
    })
    if (taskCount > 0) {
      return NextResponse.json(
        { message: 'この列にタスクが残っているため削除できません。先にタスクを別列へ移してください。' },
        { status: 400 }
      )
    }

    await prisma.projectKanbanColumn.delete({
      where: { id: columnIdStr },
    })

    return NextResponse.json({ deleted: true, id: columnIdStr })
  } catch (e: unknown) {
    console.error('[DELETE /api/projects/[projectId]/kanban-columns/[columnId]]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: '列が見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: '列の削除に失敗しました' }, { status: 500 })
  }
}
