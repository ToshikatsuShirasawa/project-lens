import type { ProjectKanbanColumnApi } from '@/lib/types'

export function serializeProjectKanbanColumn(c: {
  id: string
  key: string
  name: string
  sortOrder: number
  colorKey: string | null
  columnType: string | null
  isArchived: boolean
}): ProjectKanbanColumnApi {
  return {
    id: c.id,
    key: c.key,
    name: c.name,
    sortOrder: c.sortOrder,
    colorKey: c.colorKey,
    columnType: c.columnType,
    isArchived: c.isArchived,
  }
}
