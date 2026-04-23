'use client'

import { useCallback, useEffect, useState } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ProjectHeader } from '@/components/layout/project-header'
import { getProject } from '@/lib/mock/project'
import { PROJECT_UPDATED_EVENT, type ProjectUpdatedDetail } from '@/lib/project-events'
import type { ProjectApiRecord, ProjectMember } from '@/lib/types'
import type { ReactNode } from 'react'

interface ProjectShellProps {
  projectId: string
  children: ReactNode
}

type ShellDisplay = {
  projectName: string
  status: 'active' | 'paused' | 'completed' | '注意' | '遅延'
  lastUpdated: string
  channels: string[]
  members: ProjectMember[]
}

function mapMockToDisplay(project: NonNullable<ReturnType<typeof getProject>>): ShellDisplay {
  return {
    projectName: project.name,
    status: project.status,
    lastUpdated: project.lastUpdated,
    channels: project.channels,
    members: project.members,
  }
}

function mapApiToDisplay(row: ProjectApiRecord): ShellDisplay {
  const updated = new Date(row.updatedAt)
  return {
    projectName: row.name,
    status: 'active',
    lastUpdated: `更新: ${updated.toLocaleString('ja-JP')}`,
    channels: [],
    members: [],
  }
}

export function ProjectShell({ projectId, children }: ProjectShellProps) {
  const [loading, setLoading] = useState(true)
  const [display, setDisplay] = useState<ShellDisplay | null>(null)
  const [loadNote, setLoadNote] = useState<string | null>(null)

  const refetch = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) setLoading(true)
    setLoadNote(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`)
      if (res.ok) {
        const row = (await res.json()) as ProjectApiRecord
        setDisplay(mapApiToDisplay(row))
        return
      }
      if (res.status === 401 || res.status === 403) {
        setDisplay(null)
        const j: unknown = await res.json().catch(() => null)
        const msg =
          j && typeof j === 'object' && 'message' in j && typeof (j as { message: unknown }).message === 'string'
            ? (j as { message: string }).message
            : 'このプロジェクトにアクセスできません'
        setLoadNote(msg)
        return
      }
      if (res.status === 404) {
        setDisplay(null)
        setLoadNote(null)
        return
      }
      const mock = getProject(projectId)
      setDisplay(mock ? mapMockToDisplay(mock) : null)
    } catch {
      const mock = getProject(projectId)
      setDisplay(mock ? mapMockToDisplay(mock) : null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<ProjectUpdatedDetail>
      if (ce.detail?.projectId === projectId) {
        void refetch({ silent: true })
      }
    }
    window.addEventListener(PROJECT_UPDATED_EVENT, onUpdated as EventListener)
    return () => window.removeEventListener(PROJECT_UPDATED_EVENT, onUpdated as EventListener)
  }, [projectId, refetch])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      </div>
    )
  }

  if (!display) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-background px-4 text-center">
        <p className="text-muted-foreground">
          {loadNote ?? 'プロジェクトが見つかりません'}
        </p>
        {loadNote ? (
          <p className="text-xs text-muted-foreground/90 max-w-sm">
            組織に所属し、かつこのプロジェクトのメンバーのみアクセスできます。
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar projectId={projectId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ProjectHeader
          projectName={display.projectName}
          status={display.status}
          lastUpdated={display.lastUpdated}
          channels={display.channels}
          members={display.members}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
