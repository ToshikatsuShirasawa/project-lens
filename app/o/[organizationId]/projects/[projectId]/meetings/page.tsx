import { ProjectShell } from '@/components/layout/project-shell'
import { MeetingsClient } from '@/components/meetings/meetings-client'

interface MeetingsPageProps {
  params: Promise<{ organizationId: string; projectId: string }>
}

export default async function MeetingsPage({ params }: MeetingsPageProps) {
  const { organizationId, projectId } = await params

  return (
    <ProjectShell projectId={projectId} organizationId={organizationId}>
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <MeetingsClient projectId={projectId} />
        </div>
      </div>
    </ProjectShell>
  )
}
