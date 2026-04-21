import { ProjectShell } from '@/components/layout/project-shell'
import { DecisionCard } from '@/components/dashboard/decision-card'
import { StatusSummaryCard } from '@/components/dashboard/status-summary-card'
import { IssueRiskPanel } from '@/components/dashboard/issue-risk-panel'
import { TaskCandidatePanel } from '@/components/dashboard/task-candidate-panel'
import { MissingInfoPanel } from '@/components/dashboard/missing-info-panel'
import { RecentUpdatesPanel } from '@/components/dashboard/recent-updates-panel'
import {
  mockDecisionCard,
  mockProjectStatus,
  mockIssues,
  mockMissingItems,
  mockTaskCandidates,
  mockActivities,
} from '@/lib/mock/dashboard'

interface DashboardPageProps {
  params: Promise<{ projectId: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { projectId } = await params

  return (
    <ProjectShell projectId={projectId}>
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* 意思決定カード — 最重要要素 */}
          <DecisionCard data={mockDecisionCard} />

          {/* メインコンテンツ: 状況 / 課題 / タスク候補 */}
          <div className="grid gap-6 lg:grid-cols-3">
            <StatusSummaryCard data={mockProjectStatus} />
            <IssueRiskPanel issues={mockIssues} />
            <TaskCandidatePanel candidates={mockTaskCandidates} />
          </div>

          {/* セカンダリ: 不足情報 / 最近の更新 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <MissingInfoPanel items={mockMissingItems} />
            <RecentUpdatesPanel activities={mockActivities} />
          </div>
        </div>
      </div>
    </ProjectShell>
  )
}
