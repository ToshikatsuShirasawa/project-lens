// ============================================================
// Core Domain Types
// ============================================================

export type UrgencyLevel = 'critical' | 'warning' | 'normal'
export type SourceType = 'slack' | 'report' | 'meeting' | 'ai'
export type SeverityLevel = 'high' | 'medium' | 'low'
export type EffortLevel = 'low' | 'medium' | 'high'

// ============================================================
// Project
// ============================================================

export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'completed'
  channels: string[]
  members: ProjectMember[]
  lastUpdated: string
  createdAt: string
}

/** プロジェクト作成時に適用するカンバン列テンプレート（`project_kanban_columns` の seed 元） */
export type KanbanTemplateKey = 'simple' | 'review'

/** テンプレート内の 1 列（DB 投入用の最小形） */
export interface ProjectKanbanColumnSeed {
  key: string
  name: string
  sortOrder: number
}

/** POST /api/projects および GET /api/projects/[projectId] の JSON 形 */
export interface ProjectCreateRequest {
  name: string
  description?: string | null
  /** 未指定時は API 側で `simple` を適用 */
  templateKey?: KanbanTemplateKey
}

export interface ProjectApiRecord {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

/** PATCH /api/projects/[projectId] — 指定キーのみ更新 */
export interface ProjectUpdateRequest {
  name?: string
  description?: string | null
}

/** GET /api/projects のレスポンス（各要素は ProjectApiRecord と同一形） */
export interface ProjectListResponse {
  projects: ProjectApiRecord[]
}

/** 新規プロジェクト作成モーダルのフォーム state */
export interface NewProjectFormState {
  name: string
  description: string
  /** カンバン初期列テンプレート（未指定時は API 側でも `simple`） */
  templateKey: KanbanTemplateKey
}

export interface ProjectMember {
  id: string
  name: string
  email: string
  role: 'pm' | 'member'
  status: 'active' | 'invited'
  avatarUrl?: string
}

// ============================================================
// Dashboard — Decision Card
// ============================================================

export interface DecisionRiskTimelineItem {
  days: number
  description: string
  severity: 'warning' | 'critical'
}

export interface DecisionPositiveTimelineItem {
  timing: string
  action: string
  outcome: string
}

export interface DecisionActionOption {
  label: string
  href: string
  effort?: EffortLevel
  impact?: EffortLevel
  purpose?: string
  outcome?: string
  expectedTimeline?: string
}

export interface DecisionCard {
  id: string
  situation: string
  context: string
  urgency: UrgencyLevel
  delayDays?: number
  daysUntilDeadline?: number
  impactTimeline: DecisionRiskTimelineItem[]
  actionTimeline: DecisionPositiveTimelineItem[]
  aiDecision: string
  aiReason: string
  alternatives: DecisionActionOption[]
  primaryAction: DecisionActionOption
}

// ============================================================
// Dashboard — Status
// ============================================================

export interface ProjectStatus {
  summary: string
  progress: number
  bottleneck: string
  bottleneckSource: SourceType
  bottleneckDelayDays?: number
  nextAction: string
  overallUrgency: UrgencyLevel
  daysUntilMilestone: number
  aiRecommendation: string
  aiRecommendationReason: string
  actions: Array<{ label: string; href: string; isRecommended?: boolean }>
}

// ============================================================
// Dashboard — Issues & Risks
// ============================================================

export interface IssueRiskItem {
  id: string
  title: string
  description: string
  severity: SeverityLevel
  source: SourceType
  urgency: UrgencyLevel
  daysUntilDeadline?: number
  aiRecommendation?: string
}

// ============================================================
// Dashboard — Missing Info
// ============================================================

export interface MissingInfoItem {
  id: string
  type: 'assignee' | 'deadline' | 'decision' | 'requirement'
  title: string
  context: string
  source: SourceType
}

// ============================================================
// Task Candidates (AI-extracted, pending review)
// ============================================================

export interface TaskCandidate {
  id: string
  title: string
  reason: string
  source: SourceType
  suggestedAssignee?: string
  suggestedDueDate?: string
  held?: boolean
}

// ============================================================
// Timeline / Activity
// ============================================================

export interface TimelineEvent {
  id: string
  type: 'report' | 'ai' | 'kanban' | 'slack' | 'meeting'
  title: string
  description: string
  user?: { name: string }
  timestamp: string
}

// ============================================================
// Kanban
// ============================================================

/** 既定テンプレートの列キー（API・DnD で使う安定識別子） */
export type KanbanColumnId = 'backlog' | 'inprogress' | 'blocked' | 'review' | 'done'

export interface KanbanTask {
  id: string
  title: string
  description?: string
  assignee?: { name: string }
  dueDate?: string
  aiOrigin?: SourceType // if task was originally a candidate
}

/** GET /api/kanban-tasks のレスポンス本体 */
export interface KanbanTasksListResponse {
  columns: ProjectKanbanColumnApi[]
  tasks: KanbanTaskApiRecord[]
}

/** GET /api/kanban-tasks に含まれる列定義（project_kanban_columns） */
export interface ProjectKanbanColumnApi {
  id: string
  key: string
  name: string
  sortOrder: number
  colorKey?: string | null
  columnType?: string | null
  isArchived: boolean
  /** GET ?includeArchived=true のときのみ付与されることがある */
  taskCount?: number
}

/** PATCH /api/projects/[projectId]/kanban-columns/[columnId] — name / isArchived を部分更新 */
export interface ProjectKanbanColumnUpdateRequest {
  name?: string
  isArchived?: boolean
}

/** DELETE /api/projects/[projectId]/kanban-columns/[columnId] — 無効列のみ物理削除 */
export interface ProjectKanbanColumnDeleteResponse {
  deleted: true
  id: string
}

/** POST /api/projects/[projectId]/kanban-columns/[columnId]/archive-with-move */
export interface ArchiveKanbanColumnWithMoveRequest {
  targetColumnId: string
}

/** archive-with-move 成功時の最小レスポンス */
export interface ArchiveKanbanColumnWithMoveResponse {
  sourceColumn: ProjectKanbanColumnApi
  movedTaskCount: number
}

/** PATCH /api/projects/[projectId]/kanban-columns/reorder — 列 ID を並び順どおりに並べる */
export interface ProjectKanbanColumnsReorderRequest {
  columnIds: string[]
}

/** 列一覧または並び替え直後の API 応答 */
export interface ProjectKanbanColumnsListResponse {
  columns: ProjectKanbanColumnApi[]
}

/** GET /api/kanban-tasks の1件（Prisma 列名・日付は JSON 用に正規化済み） */
export interface KanbanTaskApiRecord {
  id: string
  title: string
  description: string | null
  columnId: string
  /** 列マスタの key（ボード上のバケットは key 基準） */
  columnKey: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  assignee: { name: string | null } | null
}

/** PATCH /api/kanban-tasks/[taskId] — column / columnKey は列 key、columnId は列マスタ id */
export interface KanbanTaskUpdateRequest {
  projectId: string
  column?: string
  columnKey?: string
  columnId?: string
  sortOrder?: number
}

/** POST /api/kanban-tasks — 列は project のマスタを columnKey / columnId で指定 */
export interface KanbanTaskCreateRequest {
  projectId: string
  title: string
  description?: string | null
  column?: string
  columnKey?: string
  columnId?: string
}

export interface KanbanColumn {
  id: KanbanColumnId
  title: string
  tasks: KanbanTask[]
}

// ============================================================
// Work Reports
// ============================================================

export interface WorkReport {
  id: string
  completed: string
  inProgress: string
  blockers: string
  nextActions: string
  submittedAt: string
  submittedBy: string
}

export interface WorkReportPreview {
  status: string[]
  issues: string[]
  risks: string[]
  todos: string[]
  missingInfo: string[]
  taskCandidates: string[]
}

// ============================================================
// Meetings
// ============================================================

export interface MeetingParticipant {
  name: string
}

export interface MeetingDecision {
  text: string
}

export interface MeetingUnresolvedPoint {
  text: string
  priority: SeverityLevel
  deadline: string
}

export interface MeetingFollowupTask {
  id: string
  title: string
  assignee?: string
  dueDate: string
  status: 'kanban' | 'candidate' | 'pending'
}

export interface Meeting {
  id: string
  title: string
  date: string
  time: string
  participants: MeetingParticipant[]
  hasAgenda?: boolean
  isPast?: boolean
  agenda?: string[]
  notes?: string
  decisions?: string[]
  unresolvedPoints?: MeetingUnresolvedPoint[]
  followUpTasks?: MeetingFollowupTask[]
}
