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
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Plus,
  List,
  Check,
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

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'projectlens:sidebar-collapsed'

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
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarStateLoaded, setSidebarStateLoaded] = useState(false)

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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
      if (stored === 'true') {
        setCollapsed(true)
      } else if (stored === 'false') {
        setCollapsed(false)
      }
    } catch {
      // localStorage is unavailable in some environments.
    } finally {
      setSidebarStateLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!sidebarStateLoaded) return
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
    } catch {
      // Ignore persistence errors and keep UI interactive.
    }
  }, [collapsed, sidebarStateLoaded])

  const currentMeta = quickProjects?.find((p) => p.id === projectId)
  const currentOrganizationId = currentMeta?.organizationId ?? null
  const workspaceProjects = quickProjects?.filter((project) => project.organizationId === currentOrganizationId) ?? []
  const triggerTitle = currentMeta?.name ?? (quickProjects === null ? '読み込み中…' : 'プロジェクト')

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        contextOrganizationId={currentMeta?.organizationId}
      />

      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border/80',
          collapsed ? 'justify-between px-1.5' : 'gap-2.5 px-4'
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed ? <span className="font-semibold text-foreground tracking-tight">ProjectLens</span> : null}
        {!collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="サイドバーを折りたたむ"
            title="サイドバーを折りたたむ"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="サイドバーを展開"
            title="サイドバーを展開"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed ? (
        <div className="border-b border-border/80 px-3 py-3">
          <WorkspaceSwitcher activeOrganizationId={currentOrganizationId} variant="headerControl" />
        </div>
      ) : null}

      {!collapsed ? (
        <div className="border-b border-border/80 px-3 py-2.5">
          <div className="space-y-1">
            <Link
              href={currentOrganizationId ? `/o/${encodeURIComponent(currentOrganizationId)}/projects` : '/projects'}
              className="flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <List className="h-4 w-4 shrink-0" aria-hidden />
              <span>プロジェクト一覧</span>
            </Link>
            <button
              type="button"
              onClick={() => setNewProjectOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              <span>新規プロジェクト</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Project: workspace より一段軽いトーン（セレクタ）— 幅・最低高さはワークスペースと揃える */}
      <div className={cn('min-w-0 border-b border-border/80', collapsed ? 'px-2 py-2' : 'px-3 py-2.5')}>
        {!collapsed ? (
          <p className="mb-1.5 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground">プロジェクト</p>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full max-w-full min-w-0 rounded-lg border border-border/70 bg-muted/15 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                collapsed
                  ? 'h-10 items-center justify-center p-0'
                  : 'min-h-[6.25rem] items-stretch justify-between gap-2 px-2.5 py-2.5'
              )}
              aria-label="プロジェクトメニューを開く"
              title={collapsed ? triggerTitle : undefined}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground/90" />
              ) : (
                <>
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-0.5 pr-0.5">
                    <span
                      className="line-clamp-2 break-words font-medium text-[13px] leading-snug text-foreground"
                      title={triggerTitle}
                    >
                      {triggerTitle}
                    </span>
                  </div>
                  <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 self-start text-muted-foreground/90" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 min-w-52">
            <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[11px] font-normal text-muted-foreground">プロジェクト</DropdownMenuLabel>
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
              workspaceProjects.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  プロジェクトがありません
                </DropdownMenuItem>
              )}
            {quickProjects !== null && !quickListError && workspaceProjects.length > 0 && (
              <div className="max-h-60 overflow-y-auto">
                {workspaceProjects.map((project) => {
                  const isCurrent = project.id === projectId
                  return (
                    <DropdownMenuItem
                      key={project.id}
                      asChild
                      className={cn('p-0', isCurrent && 'bg-primary/15 focus:bg-primary/20')}
                    >
                      <Link
                        href={`/projects/${project.id}/dashboard`}
                        className="flex w-full items-center gap-2 px-2 py-2.5"
                      >
                        {isCurrent ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <span className="inline-block w-3.5 shrink-0" aria-hidden />
                        )}
                        <span
                          className={cn(
                            'truncate text-sm',
                            isCurrent ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'
                          )}
                        >
                          {project.name}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className={cn('flex-1 space-y-0.5', collapsed ? 'px-2 py-2' : 'px-3 py-2.5')} aria-label="プロジェクト内メニュー">
        {!collapsed ? <p className="px-1 mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">メニュー</p> : null}
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.name}
              aria-label={item.name}
              className={cn(
                'group flex items-center rounded-md border border-transparent text-[13px] font-medium leading-snug transition-colors',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2',
                isActive
                  ? 'border-primary/15 bg-primary/8 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon
                className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
                aria-hidden
              />
              {!collapsed ? <span>{item.name}</span> : null}
            </Link>
          )
        })}
      </nav>

      {!collapsed ? (
        <div className="border-t border-border p-3">
          <UserAccountBar />
        </div>
      ) : null}

      {/* AI Status */}
      <div className={cn('border-t border-border', collapsed ? 'p-2' : 'p-3')}>
        <div className={cn('rounded-lg bg-primary/10 border border-primary/15', collapsed ? 'flex justify-center px-0 py-3' : 'flex items-center gap-2.5 px-3 py-2.5')}>
          <div className="flex h-2 w-2 shrink-0 items-center justify-center relative">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </div>
          {!collapsed ? <span className="text-xs font-medium text-foreground">AI分析: アクティブ</span> : null}
        </div>
      </div>
    </aside>
  )
}
