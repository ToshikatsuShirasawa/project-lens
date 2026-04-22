import type { KanbanTaskApiRecord } from '@/lib/types'

/** API 応答用（GET 一覧・POST・PATCH で共通化） */
export function serializeKanbanTask(t: {
  id: string
  title: string
  description: string | null
  columnId: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  assignee: { name: string | null } | null
  kanbanColumn: { key: string }
}): KanbanTaskApiRecord {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    columnId: t.columnId,
    columnKey: t.kanbanColumn.key,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignee: t.assignee ? { name: t.assignee.name } : null,
  }
}
