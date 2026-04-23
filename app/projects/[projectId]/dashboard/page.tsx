import { ProjectShell } from '@/components/layout/project-shell'
import { ProjectDashboard } from '@/components/dashboard/project-dashboard'

interface DashboardPageProps {
  params: Promise<{ projectId: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { projectId } = await params

  return (
    <ProjectShell projectId={projectId} redirectToNewUrl>
      <div className="p-6">
        <ProjectDashboard projectId={projectId} />
      </div>
    </ProjectShell>
  )
}
