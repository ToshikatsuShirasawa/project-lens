/**
 * @deprecated 正本は `kanban-column-templates`。互換のため `simple` と同一の配列を再エクスポート。
 */
export {
  DEFAULT_KANBAN_TEMPLATE_KEY,
  KANBAN_COLUMN_TEMPLATES,
  getKanbanColumnSeedsForTemplate,
} from './kanban-column-templates'

import { getKanbanColumnSeedsForTemplate } from './kanban-column-templates'

/** @deprecated `getKanbanColumnSeedsForTemplate('simple')` を参照 */
export const DEFAULT_PROJECT_KANBAN_COLUMNS = getKanbanColumnSeedsForTemplate('simple')
