import { ProjectShell } from '@/components/layout/project-shell'
import { KanbanBoard } from '@/components/kanban/kanban-board'

interface KanbanPageProps {
  params: Promise<{ organizationId: string; projectId: string }>
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  const { organizationId, projectId } = await params

  return (
    <ProjectShell projectId={projectId} organizationId={organizationId}>
      <div className="h-full">
        <KanbanBoard projectId={projectId} />
      </div>
    </ProjectShell>
  )
}
