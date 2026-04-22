import { ProjectShell } from '@/components/layout/project-shell'
import { KanbanBoard } from '@/components/kanban/kanban-board'

interface KanbanPageProps {
  params: Promise<{ projectId: string }>
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  const { projectId } = await params

  return (
    <ProjectShell projectId={projectId}>
      <div className="h-full">
        <KanbanBoard projectId={projectId} />
      </div>
    </ProjectShell>
  )
}
