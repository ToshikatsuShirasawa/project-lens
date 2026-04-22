'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Kanban, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import type { ProjectApiRecord, ProjectListResponse } from '@/lib/types'

function ProjectsListInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<ProjectApiRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewProjectOpen(true)
      router.replace('/projects', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const res = await fetch('/api/projects')
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
  }, [])

  const loading = projects === null

  return (
    <>
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />

      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="border-b border-border bg-card px-6 py-4 shrink-0">
          <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground truncate">ProjectLens</span>
            </div>
            <Button size="sm" type="button" className="gap-1.5" onClick={() => setNewProjectOpen(true)}>
              <Plus className="h-4 w-4" />
              新規プロジェクト作成
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <h1 className="text-lg font-semibold text-foreground">全プロジェクト</h1>
              <p className="text-sm text-muted-foreground mt-1">
                普段の切り替えはサイドバー上部のメニューから行えます。ここは全件の確認・ブックマーク用の補助画面です。
              </p>
            </div>

            {loading && <p className="text-sm text-muted-foreground">読み込み中…</p>}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && projects?.length === 0 && (
              <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg px-4 py-8 text-center">
                まだプロジェクトがありません。右上の「新規プロジェクト作成」から追加してください。
              </p>
            )}

            {!loading && projects && projects.length > 0 && (
              <ul className="space-y-3">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}/kanban`} className="block group">
                      <Card className="border-border shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30">
                        <CardHeader className="py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <CardTitle className="text-base font-medium leading-snug group-hover:text-primary transition-colors">
                                {p.name}
                              </CardTitle>
                              {p.description ? (
                                <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                              ) : null}
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                              <Kanban className="h-4 w-4" />
                              カンバン
                            </span>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
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
