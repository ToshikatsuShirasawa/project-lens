import type { PrismaClient } from '@/lib/generated/prisma/client'

type ColumnDb = Pick<PrismaClient, 'projectKanbanColumn'>

/**
 * project 配下の列を columnId または key（column / columnKey）で解決する。
 */
export async function resolveProjectKanbanColumn(
  db: ColumnDb,
  projectId: string,
  input: { columnId?: string; columnKey?: string; column?: string }
): Promise<{ id: string; key: string } | null> {
  const id = input.columnId?.trim()
  if (id) {
    const col = await db.projectKanbanColumn.findFirst({
      where: { id, projectId, isArchived: false },
      select: { id: true, key: true },
    })
    return col
  }
  const key = (input.columnKey ?? input.column)?.trim()
  if (!key) return null
  const col = await db.projectKanbanColumn.findFirst({
    where: { projectId, key, isArchived: false },
    select: { id: true, key: true },
  })
  return col
}
