import type { KanbanTemplateKey, ProjectKanbanColumnSeed } from '@/lib/types'

/** 新規プロジェクト未指定時に使うテンプレート */
export const DEFAULT_KANBAN_TEMPLATE_KEY: KanbanTemplateKey = 'simple'

/** カンバン列の初期テンプレート（プロジェクト作成時に project_kanban_columns へ展開） */
export const KANBAN_COLUMN_TEMPLATES: Record<
  KanbanTemplateKey,
  readonly ProjectKanbanColumnSeed[]
> = {
  simple: [
    { key: 'backlog', name: 'バックログ', sortOrder: 0 },
    { key: 'inprogress', name: '進行中', sortOrder: 1 },
    { key: 'done', name: '完了', sortOrder: 2 },
  ],
  review: [
    { key: 'backlog', name: 'バックログ', sortOrder: 0 },
    { key: 'inprogress', name: '進行中', sortOrder: 1 },
    { key: 'review', name: 'レビュー', sortOrder: 2 },
    { key: 'done', name: '完了', sortOrder: 3 },
  ],
}

export function isKanbanTemplateKey(value: string): value is KanbanTemplateKey {
  return value === 'simple' || value === 'review'
}

export function getKanbanColumnSeedsForTemplate(
  key: KanbanTemplateKey
): readonly ProjectKanbanColumnSeed[] {
  return KANBAN_COLUMN_TEMPLATES[key]
}

/**
 * クライアントの空ボード用キー集合（テンプレートの和 + 旧 5 列の blocked）。
 * 既存プロジェクトの列構成を壊さず、エラー時の空オブジェクトにも使う。
 */
export function getAllKanbanColumnKeysForEmptyBoard(): readonly string[] {
  const set = new Set<string>()
  for (const cols of Object.values(KANBAN_COLUMN_TEMPLATES)) {
    for (const c of cols) set.add(c.key)
  }
  set.add('blocked')
  return Array.from(set)
}
