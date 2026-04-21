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

export type KanbanColumnId = 'backlog' | 'inprogress' | 'blocked' | 'review' | 'done'

export interface KanbanTask {
  id: string
  title: string
  description?: string
  assignee?: { name: string }
  dueDate?: string
  aiOrigin?: SourceType // if task was originally a candidate
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
