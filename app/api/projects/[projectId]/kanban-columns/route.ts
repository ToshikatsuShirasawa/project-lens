import { NextResponse } from 'next/server'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { serializeProjectKanbanColumn } from '@/lib/kanban/serialize-kanban-column'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response
    const id = access.ctx.project.id

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const columnRows = await prisma.projectKanbanColumn.findMany({
      where: includeArchived ? { projectId: id } : { projectId: id, isArchived: false },
      orderBy: { sortOrder: 'asc' },
      ...(includeArchived
        ? { include: { _count: { select: { tasks: true } } } }
        : {}),
    })

    const columns = columnRows.map((row) => {
      const base = serializeProjectKanbanColumn(row)
      if (includeArchived && '_count' in row) {
        const withCount = row as typeof row & { _count: { tasks: number } }
        return { ...base, taskCount: withCount._count.tasks }
      }
      return base
    })

    return NextResponse.json({ columns })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/kanban-columns]', e)
    return NextResponse.json({ message: 'カンバン列の取得に失敗しました' }, { status: 500 })
  }
}
