import { TaskPriority } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { resolveProjectKanbanColumn } from '@/lib/kanban/resolve-kanban-column'
import { serializeProjectKanbanColumn } from '@/lib/kanban/serialize-kanban-column'
import { serializeKanbanTask } from '@/lib/kanban/serialize-kanban-task'
import { prisma } from '@/lib/prisma'

const PRIO_SET = new Set([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json({ message: 'projectId が必要です' }, { status: 400 })
    }

    const columnRows = await prisma.projectKanbanColumn.findMany({
      where: { projectId, isArchived: false },
      orderBy: { sortOrder: 'asc' },
    })
    const columns = columnRows.map(serializeProjectKanbanColumn)

    const rows = await prisma.kanbanTask.findMany({
      where: { projectId },
      include: {
        assignee: { select: { name: true } },
        kanbanColumn: { select: { key: true } },
      },
      orderBy: [
        { kanbanColumn: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    const tasks = rows.map((t) =>
      serializeKanbanTask({
        ...t,
        assignee: t.assignee ? { name: t.assignee.name } : null,
        kanbanColumn: t.kanbanColumn,
      })
    )

    return NextResponse.json({ columns, tasks })
  } catch (e) {
    console.error('[GET /api/kanban-tasks]', e)
    return NextResponse.json(
      { message: 'タスク一覧の取得に失敗しました' },
      { status: 500 }
    )
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

    const raw = body as Record<string, unknown>
    const { projectId, title, description, dueDate, priority, column, columnKey, columnId } = raw
    const projectIdStr = typeof projectId === 'string' ? projectId.trim() : ''
    const titleStr = typeof title === 'string' ? title.trim() : ''

    if (!projectIdStr) {
      return NextResponse.json({ message: 'projectId が必要です' }, { status: 400 })
    }
    if (!titleStr) {
      return NextResponse.json({ message: 'title が必要です' }, { status: 400 })
    }

    const projectExists = await prisma.project.findUnique({
      where: { id: projectIdStr },
      select: { id: true },
    })
    if (!projectExists) {
      return NextResponse.json(
        {
          message:
            'projectId に一致するプロジェクトがありません。Prisma Studio 等で projects テーブルに行を追加するか、URL の projectId を実在する id に合わせてください。',
        },
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
        { message: 'column / columnKey / columnId で有効な列を指定してください' },
        { status: 400 }
      )
    }

    let descriptionValue: string | null = null
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json({ message: 'description の型が不正です' }, { status: 400 })
      }
      const d = description.trim()
      descriptionValue = d.length > 0 ? d : null
    }

    let dueDateValue: Date | null = null
    if (dueDate !== undefined && dueDate !== null) {
      if (typeof dueDate !== 'string') {
        return NextResponse.json({ message: 'dueDate の型が不正です' }, { status: 400 })
      }
      const s = dueDate.trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return NextResponse.json({ message: 'dueDate は YYYY-MM-DD 形式、または null としてください' }, { status: 400 })
      }
      const d = new Date(`${s}T00:00:00.000Z`)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ message: 'dueDate の日付が不正です' }, { status: 400 })
      }
      dueDateValue = d
    }

    let priorityValue: (typeof TaskPriority)[keyof typeof TaskPriority] | null = null
    if (priority !== undefined && priority !== null) {
      if (typeof priority !== 'string' || !PRIO_SET.has(priority as (typeof TaskPriority)[keyof typeof TaskPriority])) {
        return NextResponse.json(
          { message: 'priority は LOW / MEDIUM / HIGH のいずれか、または null としてください' },
          { status: 400 }
        )
      }
      priorityValue = priority as (typeof TaskPriority)[keyof typeof TaskPriority]
    }

    const agg = await prisma.kanbanTask.aggregate({
      where: { projectId: projectIdStr, columnId: resolved.id },
      _max: { sortOrder: true },
    })
    const nextSortOrder = (agg._max.sortOrder ?? -1) + 1

    const created = await prisma.kanbanTask.create({
      data: {
        projectId: projectIdStr,
        title: titleStr,
        description: descriptionValue,
        dueDate: dueDateValue,
        priority: priorityValue,
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
        ...created,
        assignee: created.assignee ? { name: created.assignee.name } : null,
        kanbanColumn: created.kanbanColumn,
      }),
      { status: 201 }
    )
  } catch (e) {
    console.error('[POST /api/kanban-tasks]', e)
    return NextResponse.json({ message: 'タスクの作成に失敗しました' }, { status: 500 })
  }
}
