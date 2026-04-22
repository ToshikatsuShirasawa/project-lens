import { NextResponse } from 'next/server'
import { serializeProjectKanbanColumn } from '@/lib/kanban/serialize-kanban-column'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const id = projectId?.trim()
    if (!id) {
      return NextResponse.json({ message: 'projectId が不正です' }, { status: 400 })
    }

    const projectExists = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!projectExists) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    const columnRows = await prisma.projectKanbanColumn.findMany({
      where: { projectId: id, isArchived: false },
      orderBy: { sortOrder: 'asc' },
    })
    const columns = columnRows.map(serializeProjectKanbanColumn)

    return NextResponse.json({ columns })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/kanban-columns]', e)
    return NextResponse.json({ message: 'カンバン列の取得に失敗しました' }, { status: 500 })
  }
}
