import { ProjectShell } from '@/components/layout/project-shell'
import { ProjectInputForm } from '@/components/reports/project-input-form'
import { WorkReportForm } from '@/components/reports/work-report-form'
import { RecentReportsPanel } from '@/components/reports/recent-reports-panel'

interface ReportsPageProps {
  params: Promise<{ organizationId: string; projectId: string }>
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { organizationId, projectId } = await params

  return (
    <ProjectShell projectId={projectId} organizationId={organizationId}>
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">作業報告</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AIが入力内容を整理し、タスク候補と課題を自動検出します
            </p>
          </div>
          <ProjectInputForm projectId={projectId} />
          <WorkReportForm projectId={projectId} />
          <RecentReportsPanel projectId={projectId} />
        </div>
      </div>
    </ProjectShell>
  )
}
