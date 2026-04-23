'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAccountBar } from '@/components/auth/user-account-bar'
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import { GETTING_STARTED_DEFAULT } from '@/lib/auth/paths'
import type {
  MeApiResponse,
  OrganizationListResponse,
  ProjectApiRecord,
  ProjectListResponse,
} from '@/lib/types'

type WorkspaceGroup = {
  organizationId: string
  organizationName: string
  projects: ProjectApiRecord[]
}

function buildWorkspaceGroups(projects: ProjectApiRecord[]): WorkspaceGroup[] {
  const byId = new Map<string, WorkspaceGroup>()
  for (const p of projects) {
    const oid = p.organizationId
    const oname = p.organizationName?.trim() || 'ワークスペース'
    let g = byId.get(oid)
    if (!g) {
      g = { organizationId: oid, organizationName: oname, projects: [] }
      byId.set(oid, g)
    }
    g.projects.push(p)
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.organizationName.localeCompare(b.organizationName, 'ja', { sensitivity: 'base' })
  )
}

/** カードは全体がカンバンへのリンク。右側は同じ行動の目印としてボタン風 */
function ProjectListCard({ project: p }: { project: ProjectApiRecord }) {
  const href = `/projects/${p.id}/kanban`
  const label = `「${p.name}」のカンバンを開く`
  return (
    <Link
      href={href}
      className="block group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={label}
    >
      <Card className="border-border shadow-sm transition-colors hover:border-primary/45 hover:bg-muted/35">
        <CardHeader className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-base font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
                {p.name}
              </CardTitle>
              {p.description ? <CardDescription className="line-clamp-2">{p.description}</CardDescription> : null}
            </div>
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary"
              aria-hidden
            >
              カンバンを開く
              <ChevronRight className="h-3.5 w-3.5 opacity-90" />
            </span>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}

function ProjectsListInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<ProjectApiRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [organizations, setOrganizations] = useState<OrganizationListResponse['organizations'] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (cancelled || !res.ok) return
        const me = (await res.json()) as MeApiResponse
        if (me.user?.id && me.needsOnboarding) {
          router.replace(GETTING_STARTED_DEFAULT)
        }
      } catch {
        // 一覧はそのまま試行
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const organizationIdFromUrl = searchParams.get('organizationId')?.trim() ?? ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/organizations', { cache: 'no-store' })
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok || cancelled) return
        const list =
          body && typeof body === 'object' && 'organizations' in body && Array.isArray((body as OrganizationListResponse).organizations)
            ? (body as OrganizationListResponse).organizations
            : []
        if (!cancelled) setOrganizations(list)
      } catch {
        if (!cancelled) setOrganizations([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (organizations === null || organizations.length !== 1) return
    if (organizationIdFromUrl) return
    const only = organizations[0]
    const p = new URLSearchParams()
    p.set('organizationId', only.id)
    if (searchParams.get('new') === '1') p.set('new', '1')
    router.replace(`/projects?${p.toString()}`, { scroll: false })
  }, [organizations, organizationIdFromUrl, router, searchParams])

  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    setNewProjectOpen(true)
    const p = new URLSearchParams()
    const o = searchParams.get('organizationId')?.trim()
    if (o) p.set('organizationId', o)
    router.replace(p.toString() ? `/projects?${p.toString()}` : '/projects', { scroll: false })
  }, [searchParams, router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const path =
          organizationIdFromUrl.length > 0
            ? `/api/projects?organizationId=${encodeURIComponent(organizationIdFromUrl)}`
            : '/api/projects'
        const res = await fetch(path)
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const msg =
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
              ? (body as { message: string }).message
              : `HTTP ${res.status}`
          throw new Error(msg)
        }
        const list =
          body && typeof body === 'object' && 'projects' in body && Array.isArray((body as ProjectListResponse).projects)
            ? (body as ProjectListResponse).projects
            : []
        if (!cancelled) setProjects(list)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '読み込みに失敗しました')
          setProjects([])
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [organizationIdFromUrl])

  const activeOrgName = useMemo(() => {
    if (!organizationIdFromUrl || !organizations) return null
    return organizations.find((o) => o.id === organizationIdFromUrl)?.name ?? null
  }, [organizationIdFromUrl, organizations])

  const createContextOrgId = useMemo(() => {
    if (organizationIdFromUrl) return organizationIdFromUrl
    if (organizations?.length === 1) return organizations[0].id
    return null
  }, [organizationIdFromUrl, organizations])

  const loading = projects === null

  /** `?organizationId=` なし＝全ワークスペース（複数所属時） */
  const showWorkspaceOnCards = organizationIdFromUrl.length === 0

  const workspaceGroups = useMemo(() => {
    if (!projects || !showWorkspaceOnCards) return null
    return buildWorkspaceGroups(projects)
  }, [projects, showWorkspaceOnCards])

  const listDetail = useMemo(() => {
    if (organizations === null) return '読み込み中…'
    if (organizations.length === 0) return '参加できるプロジェクトを選ぶ・作る画面です。'
    if (organizations.length === 1) {
      return 'このワークスペース内のプロジェクトに移動する画面です。'
    }
    if (!organizationIdFromUrl) {
      return '参加中のワークスペースのプロジェクトを横断して見る画面です。特定の workspace の「まとまり（ホーム）」は /workspace?organizationId=… で、毎回の着地点はサイドバーのワークスペース切替でそこへ飛びます。ここ（/projects）は全件の俯瞰と絞り込み用です。'
    }
    if (activeOrgName) {
      return `「${activeOrgName}」内のプロジェクトに絞り込み中です。`
    }
    return '表示を読み込み中です。'
  }, [organizations, organizationIdFromUrl, activeOrgName])

  return (
    <>
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        contextOrganizationId={createContextOrgId}
      />

      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="border-b border-border bg-card px-6 py-4 shrink-0">
            <div className="mx-auto max-w-2xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground truncate">ProjectLens</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <UserAccountBar variant="inline" />
              <Button size="sm" type="button" className="gap-1.5" onClick={() => setNewProjectOpen(true)}>
                <Plus className="h-4 w-4" />
                新規
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-2xl space-y-8">
            <div className="max-w-2xl">
              <WorkspaceSwitcher
                fullWidth
                className="mb-4"
                activeOrganizationId={organizationIdFromUrl || null}
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-foreground tracking-tight">プロジェクト一覧</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">{listDetail}</p>
            </div>

            {loading && <p className="text-sm text-muted-foreground">読み込み中…</p>}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && projects?.length === 0 && (
              <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg px-4 py-8 text-center leading-relaxed">
                まだプロジェクトがありません。右上の「新規」から作成できます。
              </p>
            )}

            {!loading && projects && projects.length > 0 && showWorkspaceOnCards && workspaceGroups && workspaceGroups.length > 0 && (
              <div className="space-y-10">
                {workspaceGroups.map((group) => (
                  <section
                    key={group.organizationId}
                    className="space-y-3"
                    aria-labelledby={`ws-${group.organizationId}`}
                    data-organization-id={group.organizationId}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 border-b border-border/90 pb-2.5">
                      <h2
                        id={`ws-${group.organizationId}`}
                        className="text-sm font-semibold text-foreground tracking-tight"
                      >
                        {group.organizationName}
                      </h2>
                      <Link
                        href={`/projects?organizationId=${encodeURIComponent(group.organizationId)}`}
                        className="text-xs font-medium text-primary hover:underline decoration-primary/50 underline-offset-2 shrink-0"
                      >
                        このワークスペースに絞る
                      </Link>
                    </div>
                    <ul className="space-y-3 list-none p-0 m-0">
                      {group.projects.map((p) => (
                        <li key={p.id} data-organization-id={p.organizationId}>
                          <ProjectListCard project={p} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {!loading && projects && projects.length > 0 && !showWorkspaceOnCards && (
              <ul className="space-y-3 list-none p-0 m-0">
                {projects.map((p) => (
                  <li key={p.id} data-organization-id={p.organizationId}>
                    <ProjectListCard project={p} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </>
  )
}

export default function ProjectsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/20 flex flex-col">
          <header className="border-b border-border bg-card px-6 py-4">
            <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
              <span className="font-semibold text-foreground">ProjectLens</span>
            </div>
          </header>
          <main className="flex-1 p-6">
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">読み込み中…</p>
          </main>
        </div>
      }
    >
      <ProjectsListInner />
    </Suspense>
  )
}
