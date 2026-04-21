import { AppSidebar } from '@/components/layout/app-sidebar'
import { ProjectHeader } from '@/components/layout/project-header'
import { getProject } from '@/lib/mock/project'
import type { ReactNode } from 'react'

interface ProjectShellProps {
  projectId: string
  children: ReactNode
}

export function ProjectShell({ projectId, children }: ProjectShellProps) {
  const project = getProject(projectId)

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">プロジェクトが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar projectId={projectId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ProjectHeader
          projectName={project.name}
          status={project.status}
          lastUpdated={project.lastUpdated}
          channels={project.channels}
          members={project.members}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
