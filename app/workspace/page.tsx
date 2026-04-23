'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, Kanban, LayoutDashboard, List, Plus, Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAccountBar } from '@/components/auth/user-account-bar'
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import { GETTING_STARTED_DEFAULT } from '@/lib/auth/paths'
import { workspaceProjectUsageLabel } from '@/lib/organization/workspace-usage-label'
import type {
  MeApiResponse,
  OrganizationListResponse,
  OrganizationMemberRoleApi,
  OrganizationMembershipApiRecord,
  ProjectApiRecord,
  ProjectListResponse,
} from '@/lib/types'

const ORG_ROLE_JA: Record<OrganizationMemberRoleApi, string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  MEMBER: 'メンバー',
}

function WorkspaceHomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgIdFromUrl = searchParams.get('organizationId')?.trim() ?? ''

  const [organizations, setOrganizations] = useState<OrganizationListResponse['organizations'] | null>(null)
  const [orgsError, setOrgsError] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectApiRecord[] | null>(null)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const loadOrganizations = useCallback(async () => {
    setOrgsError(null)
    try {
      const res = await fetch('/api/organizations', { cache: 'no-store', credentials: 'include' })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        throw new Error(msg)
      }
      const list =
        body && typeof body === 'object' && 'organizations' in body && Array.isArray((body as OrganizationListResponse).organizations)
          ? (body as OrganizationListResponse).organizations
          : []
      setOrganizations(list)
    } catch (e) {
      setOrganizations([])
      setOrgsError(e instanceof Error ? e.message : 'ワークスペースの取得に失敗しました')
    }
  }, [])

  useEffect(() => {
    void loadOrganizations()
  }, [loadOrganizations])

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
        // 続行
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (organizations === null) return
    if (organizations.length === 0) return
    if (orgIdFromUrl) return
    if (organizations.length === 1) {
      router.replace(`/workspace?organizationId=${encodeURIComponent(organizations[0].id)}`, { scroll: false })
    }
  }, [organizations, orgIdFromUrl, router])

  const currentOrg = useMemo((): OrganizationMembershipApiRecord | null => {
    if (!orgIdFromUrl || !organizations) return null
    return organizations.find((o) => o.id === orgIdFromUrl) ?? null
  }, [orgIdFromUrl, organizations])

  const loadProjects = useCallback(async (organizationId: string) => {
    setProjectsError(null)
    setProjects(null)
    try {
      const res = await fetch(`/api/projects?organizationId=${encodeURIComponent(organizationId)}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        throw new Error(msg)
      }
      const list =
        body && typeof body === 'object' && 'projects' in body && Array.isArray((body as ProjectListResponse).projects)
          ? (body as ProjectListResponse).projects
          : []
      setProjects(list)
    } catch (e) {
      setProjects([])
      setProjectsError(e instanceof Error ? e.message : 'プロジェクトの取得に失敗しました')
    }
  }, [])

  useEffect(() => {
    if (!orgIdFromUrl) return
    if (organizations === null) return
    if (!currentOrg) return
    void loadProjects(orgIdFromUrl)
  }, [orgIdFromUrl, organizations, currentOrg, loadProjects])

  if (organizations === null) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        読み込み中…
      </p>
    )
  }

  if (orgsError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {orgsError}
      </p>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        <p>参加中のワークスペースはありません。</p>
        <Button asChild variant="outline" size="sm">
          <Link href={GETTING_STARTED_DEFAULT}>はじめに進む</Link>
        </Button>
      </div>
    )
  }

  if (organizations.length > 1 && !orgIdFromUrl) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">ワークスペースを選択</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">どのワークスペースのホームを開きますか？</p>
        </div>
        <ul className="space-y-2 list-none p-0 m-0">
          {organizations.map((o) => (
            <li key={o.id}>
              <Button asChild variant="outline" className="h-auto w-full justify-start py-3 px-3 text-left">
                <Link href={`/workspace?organizationId=${encodeURIComponent(o.id)}`} className="flex flex-col items-stretch gap-0.5">
                  <span className="font-medium text-foreground">{o.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{ORG_ROLE_JA[o.role]}</span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          <Link href="/projects" className="text-primary underline-offset-2 hover:underline">
            全ワークスペースのプロジェクト一覧
          </Link>
          へ
        </p>
      </div>
    )
  }

  if (orgIdFromUrl && organizations.length > 0 && !currentOrg) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive" role="alert">
          このワークスペースに参加していないか、無効なリンクです。
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/projects">プロジェクト一覧へ</Link>
        </Button>
      </div>
    )
  }

  if (organizations.length === 1 && !orgIdFromUrl) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        読み込み中…
      </p>
    )
  }

  if (!currentOrg) {
    return null
  }

  const { id: orgId, name: orgName } = currentOrg
  const listUrl = `/projects?organizationId=${encodeURIComponent(orgId)}`
  const allProjectsUrl = '/projects'

  return (
    <>
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        contextOrganizationId={orgId}
      />

      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="shrink-0 border-b border-border bg-card px-6 py-4">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground truncate">ProjectLens</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <UserAccountBar variant="inline" />
              <Button size="sm" type="button" className="gap-1.5" onClick={() => setNewProjectOpen(true)}>
                <Plus className="h-4 w-4" />
                新規プロジェクト
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-2xl space-y-7">
            <section aria-label="Workspace の切替" className="max-w-2xl">
              <WorkspaceSwitcher
                fullWidth
                activeOrganizationId={orgId}
                variant="headerControl"
              />
            </section>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/90 bg-card p-5 shadow-sm ring-1 ring-border/40">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Building2 className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">ワークスペース概要</p>
                    <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{orgName}</h1>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <p>
                        あなたのロール:{' '}
                        <span className="font-medium text-foreground/95">{ORG_ROLE_JA[currentOrg.role]}</span>
                      </p>
                      <p className="leading-relaxed text-foreground/85">{workspaceProjectUsageLabel(currentOrg)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" className="gap-1.5" onClick={() => setNewProjectOpen(true)}>
                  <Plus className="h-4 w-4" />
                  新規プロジェクト
                </Button>
                <Button asChild variant="outline">
                  <Link href={listUrl} className="gap-1.5">
                    <List className="h-4 w-4" />
                    このワークスペースのプロジェクト一覧
                  </Link>
                </Button>
              </div>
              <div className="mt-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={allProjectsUrl}>全ワークスペースの一覧</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">このワークスペースのプロジェクト</h2>
              {projects === null && !projectsError && (
                <p className="text-sm text-muted-foreground" role="status">
                  読み込み中…
                </p>
              )}
              {projectsError && (
                <p className="text-sm text-destructive" role="alert">
                  {projectsError}
                </p>
              )}
              {projects && projects.length === 0 && !projectsError && (
                <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg px-4 py-8 text-center leading-relaxed">
                  まだプロジェクトがありません。上の「新規プロジェクト」から作成できます。
                </p>
              )}
              {projects && projects.length > 0 && (
                <ul className="m-0 list-none space-y-3 p-0">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Card
                        className="cursor-pointer border-border shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30"
                        role="link"
                        tabIndex={0}
                        aria-label={`「${p.name}」のカンバンを開く`}
                        onClick={() => {
                          router.push(`/projects/${p.id}/kanban`)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            router.push(`/projects/${p.id}/kanban`)
                          }
                        }}
                      >
                        <CardHeader className="py-4">
                          <div className="space-y-2">
                            <div>
                              <CardTitle className="text-base font-medium text-foreground">{p.name}</CardTitle>
                              {p.description ? <CardDescription className="line-clamp-2 mt-1">{p.description}</CardDescription> : null}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1" onClick={(event) => event.stopPropagation()}>
                              <Button asChild variant="outline" size="sm" className="h-8 gap-1">
                                <Link href={`/projects/${p.id}/dashboard`}>
                                  <LayoutDashboard className="h-3.5 w-3.5" />
                                  ダッシュボード
                                </Link>
                              </Button>
                              <Button asChild size="sm" className="h-8 gap-1">
                                <Link href={`/projects/${p.id}/kanban`}>
                                  <Kanban className="h-3.5 w-3.5" />
                                  カンバンを開く
                                </Link>
                              </Button>
                              <Button asChild variant="secondary" size="sm" className="h-8 gap-1">
                                <Link href={`/projects/${p.id}/settings`}>
                                  <Settings className="h-3.5 w-3.5" />
                                  設定
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

export default function WorkspaceHomePage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Suspense
        fallback={
          <div className="p-6">
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">読み込み中…</p>
          </div>
        }
      >
        <WorkspaceHomeContent />
      </Suspense>
    </div>
  )
}
