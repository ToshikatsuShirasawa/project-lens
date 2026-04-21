import { ProjectShell } from '@/components/layout/project-shell'
import { MeetingsClient } from '@/components/meetings/meetings-client'

interface MeetingsPageProps {
  params: Promise<{ projectId: string }>
}

export default async function MeetingsPage({ params }: MeetingsPageProps) {
  const { projectId } = await params

  return (
    <ProjectShell projectId={projectId}>
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <MeetingsClient projectId={projectId} />
        </div>
      </div>
    </ProjectShell>
  )
}
