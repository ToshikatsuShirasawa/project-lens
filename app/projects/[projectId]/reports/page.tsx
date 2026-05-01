import { ProjectShell } from '@/components/layout/project-shell'
import { WorkReportForm } from '@/components/reports/work-report-form'
import { RecentReportsPanel } from '@/components/reports/recent-reports-panel'

interface ReportsPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { projectId } = await params

  return (
    <ProjectShell projectId={projectId} redirectToNewUrl>
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">作業報告</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AIが入力内容を整理し、タスク候補と課題を自動検出します
            </p>
          </div>
          <WorkReportForm projectId={projectId} />
          <RecentReportsPanel projectId={projectId} />
        </div>
      </div>
    </ProjectShell>
  )
}
