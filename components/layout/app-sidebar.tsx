'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Calendar,
  Settings,
  ChevronDown,
  Sparkles,
  Plus,
  List,
  Check,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAccountBar } from '@/components/auth/user-account-bar'
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import { PROJECT_UPDATED_EVENT } from '@/lib/project-events'
import type { ProjectApiRecord, ProjectListResponse } from '@/lib/types'

interface AppSidebarProps {
  projectId: string
}

const getNavigation = (projectId: string) => [
  { name: 'ダッシュボード', href: `/projects/${projectId}/dashboard`, icon: LayoutDashboard },
  { name: 'カンバン', href: `/projects/${projectId}/kanban`, icon: Kanban },
  { name: '作業報告', href: `/projects/${projectId}/reports`, icon: FileText },
  { name: 'ミーティング', href: `/projects/${projectId}/meetings`, icon: Calendar },
  { name: '設定', href: `/projects/${projectId}/settings`, icon: Settings },
]

export function AppSidebar({ projectId }: AppSidebarProps) {
  const pathname = usePathname()
  const navigation = getNavigation(projectId)

  const [quickProjects, setQuickProjects] = useState<ProjectApiRecord[] | null>(null)
  const [quickListError, setQuickListError] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const loadQuickList = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) throw new Error('fail')
      const list =
        body && typeof body === 'object' && 'projects' in body && Array.isArray((body as ProjectListResponse).projects)
          ? (body as ProjectListResponse).projects
          : []
      setQuickProjects(list)
      setQuickListError(false)
    } catch {
      setQuickProjects([])
      setQuickListError(true)
    }
  }, [])

  useEffect(() => {
    void loadQuickList()
  }, [loadQuickList])

  useEffect(() => {
    const onUpdated = () => {
      void loadQuickList()
    }
    window.addEventListener(PROJECT_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(PROJECT_UPDATED_EVENT, onUpdated)
  }, [loadQuickList])

  const currentMeta = quickProjects?.find((p) => p.id === projectId)
  const triggerTitle = currentMeta?.name ?? (quickProjects === null ? '読み込み中…' : 'プロジェクト')
  const triggerSubtitle =
    quickProjects === null ? '…' : currentMeta ? 'このプロジェクトを表示中' : 'メニューからプロジェクトを選択'

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        contextOrganizationId={currentMeta?.organizationId}
      />

      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border/80 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground tracking-tight">ProjectLens</span>
      </div>

      <div className="border-b border-border/80 px-3 py-3">
        <WorkspaceSwitcher activeOrganizationId={currentMeta?.organizationId ?? null} />
      </div>

      {/* Project: workspace より一段軽いトーン（セレクタ）— 幅・最低高さはワークスペースと揃える */}
      <div className="min-w-0 border-b border-border/80 px-3 py-2.5">
        <p className="mb-1.5 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground">プロジェクト</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full min-h-[6.25rem] max-w-full min-w-0 items-stretch justify-between gap-2 rounded-lg border border-border/70 bg-muted/15 px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-0.5 pr-0.5">
                <span
                  className="line-clamp-2 break-words font-medium text-[13px] leading-snug text-foreground"
                  title={triggerTitle}
                >
                  {triggerTitle}
                </span>
                <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">{triggerSubtitle}</span>
              </div>
              <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 self-start text-muted-foreground/90" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 min-w-52">
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2"
              onSelect={() => setNewProjectOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>新規プロジェクト</span>
            </DropdownMenuItem>
            {currentMeta?.organizationId ? (
              <DropdownMenuItem asChild>
                <Link
                  href={`/workspace?organizationId=${encodeURIComponent(currentMeta.organizationId)}`}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>このワークスペースのホーム</span>
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild className="text-xs text-muted-foreground focus:text-foreground">
              <Link
                href={currentMeta?.organizationId ? `/projects?organizationId=${currentMeta.organizationId}` : '/projects'}
                className="flex cursor-pointer items-center gap-2"
              >
                <List className="h-3.5 w-3.5 opacity-80" />
                <span>このワークスペースのプロジェクト一覧</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground px-2 py-1.5">
              プロジェクトを切り替え
            </DropdownMenuLabel>
            {quickProjects === null && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                読み込み中…
              </DropdownMenuItem>
            )}
            {quickListError && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                一覧を取得できませんでした
              </DropdownMenuItem>
            )}
            {quickProjects !== null &&
              !quickListError &&
              quickProjects.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  プロジェクトがありません
                </DropdownMenuItem>
              )}
            {quickProjects !== null &&
              !quickListError &&
              quickProjects.map((project) => {
                const isCurrent = project.id === projectId
                return (
                  <DropdownMenuItem
                    key={project.id}
                    asChild
                    className={cn('p-0', isCurrent && 'bg-muted/60 focus:bg-muted/60')}
                  >
                    <Link
                      href={`/projects/${project.id}/dashboard`}
                      className="flex flex-col items-stretch gap-0.5 px-2 py-2 w-full"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {isCurrent ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <span className="inline-block w-3.5 shrink-0" aria-hidden />
                        )}
                        <span
                          className={cn(
                            'truncate text-sm',
                            isCurrent ? 'font-medium text-foreground' : 'font-medium text-foreground/90'
                          )}
                        >
                          {project.name}
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1 pl-[1.375rem]">
                        {project.description || '説明なし'}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2.5" aria-label="プロジェクト内メニュー">
        <p className="px-1 mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">メニュー</p>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-[13px] font-medium leading-snug transition-colors',
                isActive
                  ? 'border-primary/15 bg-primary/8 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon
                className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
                aria-hidden
              />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <UserAccountBar />
      </div>

      {/* AI Status */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-primary/10 border border-primary/15 px-3 py-2.5">
          <div className="flex h-2 w-2 items-center justify-center relative">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">AI分析: アクティブ</span>
        </div>
      </div>
    </aside>
  )
}
