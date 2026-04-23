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

/** Prisma `ProjectMemberRole` と同じ3値（API の role 文字列） */
export type ProjectMemberRoleApi = 'OWNER' | 'ADMIN' | 'MEMBER'

/** API 上のロール文字列で「プロジェクトを管理できる」か（`myProjectRole` 等の判定用） */
export function isProjectManagerRoleApi(role: ProjectMemberRoleApi | undefined | null): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}

/** 当該ユーザーの API 上のロールが **プロジェクトのオーナー** か（OWNER 専用 UI / メンバー操作の補助） */
export function isProjectOwnerRoleApi(role: ProjectMemberRoleApi | undefined | null): boolean {
  return role === 'OWNER'
}

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
  /** 属する organization（Phase 1 以降は必須扱い） */
  organizationId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  /**
   * GET / PATCH 応答の `GET|PATCH /api/projects/[projectId]` のみ。当該ユーザーの `project_members.role`。
   * 一覧 `GET /api/projects` には含めない。
   */
  myProjectRole?: ProjectMemberRoleApi
}

/** API で organization を返すとき用（管理 UI 未実装段階の将来互換） */
export interface OrganizationApiRecord {
  id: string
  name: string
  slug: string | null
  createdAt: string
  updatedAt: string
}

/** POST /api/organizations */
export interface OrganizationCreateRequest {
  name: string
}

/** POST /api/organizations 成功 */
export type OrganizationCreateResponse = OrganizationApiRecord

export type OrganizationMemberRoleApi = 'OWNER' | 'ADMIN' | 'MEMBER'

/** POST /api/projects 成功時。一覧用 `ProjectApiRecord` と互換の本体に、作成時メタのみ付与可能 */
export interface ProjectCreateResponse extends ProjectApiRecord {
  /** 作成と同時に `project_members`（OWNER）を作ったとき true */
  ownerMemberCreated?: boolean
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

/** GET /api/auth/me レスポンス */
export interface MeApiResponse {
  user: { id: string; email: string; name: string | null } | null
  /**
   * 未ログイン時は all false。
   * いずれかの organization への所属あり（他ワークスペースの招待 MEMBER 含む）
   */
  hasOrganization: boolean
  /**
   * 所属が0件。`/getting-started` などオンボーディング用。
   * 将来: 他条件と組み合わせ可。
   */
  needsOnboarding: boolean
  /**
   * `POST /api/organizations` で**新たに**持てる枠（現状: まだ **OWNER 行がない** 場合のみ true）。
   * プラン緩和時は此処を差し替えやすい想定。
   */
  canCreateOrganization: boolean
}

/** GET /api/users の1件 */
export interface UserApiRecord {
  id: string
  name: string | null
  email: string
}

/** GET /api/users */
export interface UserListResponse {
  users: UserApiRecord[]
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

/** Prisma `TaskPriority` enum と同じ3値（API でもこの文字列を用いる） */
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface KanbanTask {
  id: string
  title: string
  description?: string
  /** 担当ユーザー id（API 永続タスク向け。仮カードでは省略可） */
  assigneeUserId?: string | null
  assignee?: { id?: string; name: string | null; email?: string }
  /** 永続化タスクは主に YYYY-MM-DD 相当の文字列 */
  dueDate?: string
  /** 永続化タスク。候補からの仮タスク等では省略可 */
  priority?: TaskPriority
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

// ============================================================
// Project dashboard — GET /api/projects/[projectId]/dashboard
// ============================================================

export interface ProjectDashboardSummary {
  totalTasks: number
  openTasks: number
  doneTasks: number
  memberCount: number
  overdueTasks: number
  upcomingTasks: number
}

export interface ProjectDashboardColumnStat {
  columnId: string
  columnKey: string
  columnName: string
  taskCount: number
  sortOrder: number
}

export interface ProjectDashboardRecentTask {
  id: string
  title: string
  updatedAt: string
  columnName: string
  columnKey: string
  assignee: { name: string | null; email: string } | null
  dueDate: string | null
  priority: TaskPriority | null
}

export interface ProjectDashboardResponse {
  summary: ProjectDashboardSummary
  columns: ProjectDashboardColumnStat[]
  recentTasks: ProjectDashboardRecentTask[]
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
  /** YYYY-MM-DD または null */
  dueDate: string | null
  /** Prisma `TaskPriority` または null */
  priority: TaskPriority | null
  columnId: string
  /** 列マスタの key（ボード上のバケットは key 基準） */
  columnKey: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  assigneeId: string | null
  assignee: { id: string; name: string | null; email: string } | null
}

/** GET /api/projects/[projectId]/members の1件（`id` は project_members の行 id） */
export interface ProjectMemberApiRecord {
  id: string
  userId: string
  name: string | null
  email: string
  role: ProjectMemberRoleApi
}

/** GET /api/projects/[projectId]/members */
export interface ProjectMembersListResponse {
  members: ProjectMemberApiRecord[]
}

/** POST /api/projects/[projectId]/members */
export interface ProjectMemberCreateRequest {
  userId: string
  role: ProjectMemberRoleApi
}

/** PATCH /api/projects/[projectId]/members/[memberId] */
export interface ProjectMemberUpdateRequest {
  role: ProjectMemberRoleApi
}

/** DELETE /api/projects/[projectId]/members/[memberId] */
export interface ProjectMemberDeleteResponse {
  deleted: true
  id: string
}

// ============================================================
// Project invitations — `project_invitations` / 招待 API
// ============================================================

export type ProjectInvitationStatusApi = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'

/** `GET|POST /api/projects/[projectId]/invitations` 相当の1件 */
export interface ProjectInvitationApiRecord {
  id: string
  projectId: string
  organizationId: string
  email: string
  role: ProjectMemberRoleApi
  status: ProjectInvitationStatusApi
  /** ISO 日時。プレビュー・一覧用 */
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
  invitedByUserId: string
}

/** `POST /api/projects/[projectId]/invitations` リクエスト */
export interface ProjectInvitationCreateRequest {
  email: string
  role: ProjectMemberRoleApi
}

/** `POST /api/projects/[projectId]/invitations` 成功（招待リンク同梱可） */
export interface ProjectInvitationCreateResponse {
  invitation: ProjectInvitationApiRecord
  /** 相対パス。フル URL は `invitationUrl` でも返す */
  invitePath: string
  /** `origin` + `invitePath` 相当。API が組み立て */
  invitationUrl: string
}

/** `GET /api/projects/[projectId]/invitations` */
export interface ProjectInvitationsListResponse {
  invitations: ProjectInvitationApiRecord[]
}

/** `GET /api/invitations/[token]` — トークン必須の公開プレビュー */
export interface ProjectInvitationPreviewResponse {
  projectId: string
  projectName: string
  email: string
  role: ProjectMemberRoleApi
  status: ProjectInvitationStatusApi
  expiresAt: string
  acceptedAt: string | null
  /** 期限切れか（DB が EXPIRED でなくても採用時に可） */
  isPastExpiry: boolean
}

/** `POST /api/invitations/accept` */
export interface ProjectInvitationAcceptRequest {
  token: string
}

export interface ProjectInvitationAcceptResponse {
  projectId: string
  projectName: string
  invitation: Pick<ProjectInvitationApiRecord, 'id' | 'status' | 'acceptedAt'>
}

/** PATCH /api/kanban-tasks/[taskId] — 列移動は column* / sortOrder。本文は title / description / dueDate / priority / assigneeId */
export interface KanbanTaskUpdateRequest {
  projectId: string
  title?: string
  description?: string | null
  dueDate?: string | null
  priority?: TaskPriority | null
  assigneeId?: string | null
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
  dueDate?: string | null
  priority?: TaskPriority | null
  assigneeId?: string | null
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
