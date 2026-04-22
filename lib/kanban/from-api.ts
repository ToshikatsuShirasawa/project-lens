import type { KanbanTask, KanbanTaskApiRecord } from '@/lib/types'

/**
 * 列マスタの順序とタスク一覧から、key ごとのカードマップを組み立てる。
 */
export function buildBoardFromApiTasks(
  columns: readonly { key: string }[],
  tasks: KanbanTaskApiRecord[]
): Record<string, KanbanTask[]> {
  const keys = columns.map((c) => c.key)
  const board = Object.fromEntries(keys.map((k) => [k, [] as KanbanTask[]])) as Record<string, KanbanTask[]>

  const fallbackKey = keys[0] ?? 'backlog'

  for (const t of tasks) {
    const key = keys.includes(t.columnKey) ? t.columnKey : fallbackKey
    const card: KanbanTask = {
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      assignee: t.assignee?.name ? { name: t.assignee.name } : undefined,
      dueDate: t.dueDate ?? undefined,
      priority: t.priority ?? undefined,
    }
    board[key]?.push(card)
  }

  return board
}
