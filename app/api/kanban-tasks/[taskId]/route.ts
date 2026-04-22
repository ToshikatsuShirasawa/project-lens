import { TaskPriority } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { resolveProjectKanbanColumn } from '@/lib/kanban/resolve-kanban-column'
import { serializeKanbanTask } from '@/lib/kanban/serialize-kanban-task'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ taskId: string }>
}

const TITLE_MAX = 2000
const DESC_MAX = 20000

const PRI_SET = new Set([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH])

type AssigneePatchParsed =
  | { ok: true; mode: 'omit' }
  | { ok: true; mode: 'set'; value: string | null }
  | { ok: false; message: string }

function parseAssigneeIdPatch(raw: Record<string, unknown>): AssigneePatchParsed {
  if (!('assigneeId' in raw)) {
    return { ok: true, mode: 'omit' }
  }
  const v = raw.assigneeId
  if (v === null) {
    return { ok: true, mode: 'set', value: null }
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) {
      return {
        ok: false,
        message: 'assigneeId は空にできません。未設定にする場合は null を指定してください',
      }
    }
    return { ok: true, mode: 'set', value: s }
  }
  return { ok: false, message: 'assigneeId は文字列または null としてください' }
}

type ContentData = {
  title?: string
  description?: string | null
  dueDate?: Date | null
  priority?: (typeof TaskPriority)[keyof typeof TaskPriority] | null
}

type FieldPatchResult = { ok: true; data: ContentData } | { ok: false; message: string; internal?: boolean }

/**
 * body に含まれる title / description / dueDate / priority を部分更新用に解釈する。
 */
function parseTaskContentPatch(raw: Record<string, unknown>): FieldPatchResult {
  const hasAny =
    'title' in raw || 'description' in raw || 'dueDate' in raw || 'priority' in raw
  if (!hasAny) {
    return { ok: false, message: '（内部）フィールド更新の指定がありません', internal: true }
  }
  const data: ContentData = {}
  if ('title' in raw) {
    const t = raw.title
    if (typeof t !== 'string') {
      return { ok: false, message: 'title の型が不正です' }
    }
    const trimmed = t.trim()
    if (!trimmed) {
      return { ok: false, message: 'title を空にすることはできません' }
    }
    if (trimmed.length > TITLE_MAX) {
      return { ok: false, message: `title は ${TITLE_MAX} 文字以内にしてください` }
    }
    data.title = trimmed
  }
  if ('description' in raw) {
    const d = raw.description
    if (d === null) {
      data.description = null
    } else if (typeof d === 'string') {
      const descTrim = d.trim()
      if (descTrim.length > DESC_MAX) {
        return { ok: false, message: `description は ${DESC_MAX} 文字以内にしてください` }
      }
      data.description = descTrim.length > 0 ? descTrim : null
    } else {
      return { ok: false, message: 'description の型が不正です' }
    }
  }
  if ('dueDate' in raw) {
    const v = raw.dueDate
    if (v === null) {
      data.dueDate = null
    } else if (typeof v === 'string') {
      const s = v.trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return { ok: false, message: 'dueDate は YYYY-MM-DD 形式、または null としてください' }
      }
      const d = new Date(`${s}T00:00:00.000Z`)
      if (Number.isNaN(d.getTime())) {
        return { ok: false, message: 'dueDate の日付が不正です' }
      }
      data.dueDate = d
    } else {
      return { ok: false, message: 'dueDate の型が不正です' }
    }
  }
  if ('priority' in raw) {
    const v = raw.priority
    if (v === null) {
      data.priority = null
    } else if (typeof v === 'string' && PRI_SET.has(v as (typeof TaskPriority)[keyof typeof TaskPriority])) {
      data.priority = v as (typeof TaskPriority)[keyof typeof TaskPriority]
    } else {
      return { ok: false, message: 'priority は LOW / MEDIUM / HIGH または null としてください' }
    }
  }
  if (Object.keys(data).length === 0) {
    return { ok: false, message: '（内部）有効なフィールド更新がありません', internal: true }
  }
  return { ok: true, data }
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

    const assigneePatch = parseAssigneeIdPatch(raw)
    if (!assigneePatch.ok) {
      return NextResponse.json({ message: assigneePatch.message }, { status: 400 })
    }
    const hasAssigneeUpdate = assigneePatch.ok && assigneePatch.mode === 'set'

    const hasFieldKeys = 'title' in raw || 'description' in raw || 'dueDate' in raw || 'priority' in raw
    let fieldData: ContentData | null = null
    if (hasFieldKeys) {
      const fp = parseTaskContentPatch(raw)
      if (!fp.ok) {
        if (fp.internal) {
          return NextResponse.json(
            {
              message: 'title / description / dueDate / priority の少なくとも一方の有効な更新を指定してください',
            },
            { status: 400 }
          )
        }
        return NextResponse.json({ message: fp.message }, { status: 400 })
      }
      fieldData = fp.data
    }

    const hasColumnTarget =
      (typeof column === 'string' && column.trim() !== '') ||
      (typeof columnKey === 'string' && columnKey.trim() !== '') ||
      (typeof columnId === 'string' && columnId.trim() !== '')

    if (!hasColumnTarget && !fieldData && !hasAssigneeUpdate) {
      return NextResponse.json(
        {
          message:
            'column / columnKey / columnId のいずれか、または title / description / dueDate / priority / assigneeId の有効な更新のいずれかが必要です',
        },
        { status: 400 }
      )
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

    const data: {
      title?: string
      description?: string | null
      dueDate?: Date | null
      columnId?: string
      sortOrder?: number
      priority?: (typeof TaskPriority)[keyof typeof TaskPriority] | null
      assigneeId?: string | null
    } = {}
    if (fieldData) {
      if (fieldData.title !== undefined) data.title = fieldData.title
      if (fieldData.description !== undefined) data.description = fieldData.description
      if (fieldData.dueDate !== undefined) data.dueDate = fieldData.dueDate
      if (fieldData.priority !== undefined) data.priority = fieldData.priority
    }

    if (hasColumnTarget) {
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
      data.columnId = resolved.id
      if (sortOrderRaw !== undefined) {
        if (typeof sortOrderRaw !== 'number' || !Number.isInteger(sortOrderRaw) || sortOrderRaw < 0) {
          return NextResponse.json({ message: 'sortOrder が不正です' }, { status: 400 })
        }
        data.sortOrder = sortOrderRaw
      } else {
        const agg = await prisma.kanbanTask.aggregate({
          where: { projectId: projectIdStr, columnId: resolved.id },
          _max: { sortOrder: true },
        })
        data.sortOrder = (agg._max.sortOrder ?? -1) + 1
      }
    }

    if (hasAssigneeUpdate) {
      if (assigneePatch.mode === 'set' && assigneePatch.value === null) {
        data.assigneeId = null
      } else if (assigneePatch.mode === 'set' && assigneePatch.value !== null) {
        const userId = assigneePatch.value
        const member = await prisma.projectMember.findFirst({
          where: { projectId: projectIdStr, userId },
          select: { userId: true },
        })
        if (!member) {
          return NextResponse.json(
            { message: '指定したユーザーはこのプロジェクトのメンバーではありません' },
            { status: 400 }
          )
        }
        data.assigneeId = userId
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: '更新対象のフィールドがありません' }, { status: 400 })
    }

    const updated = await prisma.kanbanTask.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        kanbanColumn: { select: { key: true } },
      },
    })

    return NextResponse.json(
      serializeKanbanTask({
        ...updated,
        assigneeId: updated.assigneeId,
        assignee: updated.assignee
          ? { id: updated.assignee.id, name: updated.assignee.name, email: updated.assignee.email }
          : null,
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
