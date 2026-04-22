/** ProjectShell / サイドバー等がプロジェクト更新後に再取得するためのブラウザイベント */
export const PROJECT_UPDATED_EVENT = 'projectlens:project-updated' as const

export type ProjectUpdatedDetail = { projectId: string }

export function dispatchProjectUpdated(projectId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ProjectUpdatedDetail>(PROJECT_UPDATED_EVENT, {
      detail: { projectId },
    })
  )
}

/** カンバン列名など列マスタ変更後にボードが再取得するためのブラウザイベント */
export const KANBAN_COLUMNS_UPDATED_EVENT = 'projectlens:kanban-columns-updated' as const

export type KanbanColumnsUpdatedDetail = { projectId: string }

export function dispatchKanbanColumnsUpdated(projectId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<KanbanColumnsUpdatedDetail>(KANBAN_COLUMNS_UPDATED_EVENT, {
      detail: { projectId },
    })
  )
}
