import { ProjectShell } from '@/components/layout/project-shell'
import { ProjectDashboard } from '@/components/dashboard/project-dashboard'

interface DashboardPageProps {
  params: Promise<{ organizationId: string; projectId: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { organizationId, projectId } = await params

  return (
    <ProjectShell projectId={projectId} organizationId={organizationId}>
      <div className="p-6">
        <ProjectDashboard projectId={projectId} />
      </div>
    </ProjectShell>
  )
}
