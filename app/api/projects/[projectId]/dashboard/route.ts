import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ProjectDashboardResponse } from '@/lib/types'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

function utcDayStartFromDate(d: Date): Date {
  const s = d.toISOString().slice(0, 10)
  return new Date(`${s}T00:00:00.000Z`)
}

function addUtcDays(start: Date, days: number): Date {
  const x = new Date(start.getTime())
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

/** 有効な「完了」列にいるタスクのみ done とみなす */
const activeDoneColumnWhere = {
  key: 'done' as const,
  isArchived: false,
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const id = projectId?.trim()
    if (!id) {
      return NextResponse.json({ message: 'projectId が不正です' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    const todayStart = utcDayStartFromDate(new Date())
    const upcomingEndInclusive = addUtcDays(todayStart, 6)

    const notActiveDone = {
      NOT: {
        kanbanColumn: {
          key: activeDoneColumnWhere.key,
          isArchived: activeDoneColumnWhere.isArchived,
        },
      },
    }

    const [
      totalTasks,
      doneTasks,
      memberCount,
      overdueTasks,
      upcomingTasks,
      columnRows,
      recentRows,
    ] = await Promise.all([
      prisma.kanbanTask.count({ where: { projectId: id } }),
      prisma.kanbanTask.count({
        where: { projectId: id, kanbanColumn: activeDoneColumnWhere },
      }),
      prisma.projectMember.count({ where: { projectId: id } }),
      prisma.kanbanTask.count({
        where: {
          projectId: id,
          dueDate: { lt: todayStart, not: null },
          ...notActiveDone,
        },
      }),
      prisma.kanbanTask.count({
        where: {
          projectId: id,
          dueDate: {
            gte: todayStart,
            lte: upcomingEndInclusive,
            not: null,
          },
          ...notActiveDone,
        },
      }),
      prisma.projectKanbanColumn.findMany({
        where: { projectId: id, isArchived: false },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          key: true,
          name: true,
          sortOrder: true,
          _count: { select: { tasks: true } },
        },
      }),
      prisma.kanbanTask.findMany({
        where: { projectId: id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          dueDate: true,
          priority: true,
          kanbanColumn: { select: { name: true, key: true } },
          assignee: { select: { name: true, email: true } },
        },
      }),
    ])

    const openTasks = Math.max(0, totalTasks - doneTasks)

    const body: ProjectDashboardResponse = {
      summary: {
        totalTasks,
        openTasks,
        doneTasks,
        memberCount,
        overdueTasks,
        upcomingTasks,
      },
      columns: columnRows.map((c) => ({
        columnId: c.id,
        columnKey: c.key,
        columnName: c.name,
        taskCount: c._count.tasks,
        sortOrder: c.sortOrder,
      })),
      recentTasks: recentRows.map((t) => ({
        id: t.id,
        title: t.title,
        updatedAt: t.updatedAt.toISOString(),
        columnName: t.kanbanColumn.name,
        columnKey: t.kanbanColumn.key,
        assignee: t.assignee
          ? { name: t.assignee.name, email: t.assignee.email }
          : null,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        priority: t.priority ?? null,
      })),
    }

    return NextResponse.json(body)
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/dashboard]', e)
    return NextResponse.json({ message: 'ダッシュボードの取得に失敗しました' }, { status: 500 })
  }
}
