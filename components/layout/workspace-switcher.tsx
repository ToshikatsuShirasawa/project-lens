'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveWorkspaceSwitchHref } from '@/lib/organization/workspace-switch-navigation'
import { workspaceProjectUsageLabel } from '@/lib/organization/workspace-usage-label'
import { PROJECT_UPDATED_EVENT } from '@/lib/project-events'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { OrganizationListResponse, OrganizationMembershipApiRecord } from '@/lib/types'

export interface WorkspaceSwitcherProps {
  /** ハイライトする organization id（全件表示中は null） */
  activeOrganizationId: string | null
  className?: string
  /** サイドバーは横幅固定、/projects では全幅 */
  fullWidth?: boolean
  /**
   * `headerControl` … `/workspace` 等の**切替専用**（枠弱め・枠数表示なし。本文と二重に見えない程度の情報量）
   * `default` … サイドバー等の従来の見た目
   */
  variant?: 'default' | 'headerControl'
}

const ROLE_LABEL: Record<OrganizationMembershipApiRecord['role'], string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  MEMBER: 'メンバー',
}

function UsageLine({ org, className }: { org: OrganizationMembershipApiRecord; className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground leading-relaxed line-clamp-2', className)}>
      {workspaceProjectUsageLabel(org)}
    </p>
  )
}

/** デフォルト: サイドバー等で、長い名前でも枠の幅・最低高さが揺れない */
const contextBlock = 'w-full min-h-[6.25rem] max-w-full'
const contextBlockControl = 'w-full min-h-[4.25rem] max-w-full'

export function WorkspaceSwitcher({
  activeOrganizationId,
  className,
  fullWidth = false,
  variant = 'default',
}: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<OrganizationMembershipApiRecord[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  /** workspace 切替遷移中 */
  const [navigating, setNavigating] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations', { cache: 'no-store' })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) throw new Error('fail')
      const list =
        body && typeof body === 'object' && 'organizations' in body && Array.isArray((body as OrganizationListResponse).organizations)
          ? (body as OrganizationListResponse).organizations
          : []
      setOrganizations(list)
      setLoadError(false)
    } catch {
      setOrganizations([])
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onProjectUpdated = () => {
      void load()
    }
    window.addEventListener(PROJECT_UPDATED_EVENT, onProjectUpdated)
    return () => window.removeEventListener(PROJECT_UPDATED_EVENT, onProjectUpdated)
  }, [load])

  const switchToWorkspace = useCallback(
    (organizationId: string) => {
      setNavigating(true)
      try {
        const href = resolveWorkspaceSwitchHref(organizationId)
        router.push(href)
        router.refresh()
      } finally {
        setNavigating(false)
      }
    },
    [router]
  )

  const blockClass = variant === 'headerControl' ? contextBlockControl : contextBlock

  if (organizations === null) {
    return (
      <div
        className={cn(
          'flex items-center rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5 text-sm text-muted-foreground',
          blockClass,
          variant === 'headerControl' && 'min-h-[3.25rem] py-2 text-xs',
          className
        )}
      >
        読み込み中…
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className={cn(
          'flex items-center rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-destructive',
          blockClass,
          className
        )}
        role="alert"
      >
        ワークスペースを読み込めませんでした
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center rounded-lg border border-dashed border-border/80 px-3 py-2.5 text-xs text-muted-foreground',
          blockClass,
          className
        )}
      >
        参加中のワークスペースはありません
      </div>
    )
  }

  const count = organizations.length
  const isSingle = count === 1
  const active = activeOrganizationId ? organizations.find((o) => o.id === activeOrganizationId) : null
  const showUsageForActive = active != null

  if (isSingle) {
    const o = organizations[0]
    if (variant === 'headerControl') {
      return (
        <div
          className={cn(
            'rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5',
            contextBlockControl,
            className
          )}
          role="region"
          aria-label="現在のワークスペース"
        >
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground">現在のワークスペース</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/50 bg-background/60">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-words text-sm font-medium leading-snug text-foreground/90" title={o.name}>
                {o.name}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">参加中の workspace は1件のため、切替はありません。</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div
        className={cn(
          'flex flex-col rounded-xl border-2 border-primary/15 bg-gradient-to-b from-primary/[0.06] to-card px-3.5 py-3 shadow-sm',
          contextBlock,
          className
        )}
        role="region"
        aria-label="現在のワークスペース"
      >
        <div className="flex min-h-0 min-w-0 flex-1 items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">ワークスペース</p>
            <p className="line-clamp-2 break-words font-semibold text-foreground leading-snug" title={o.name}>
              {o.name}
            </p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              <span className="text-muted-foreground/90">{ROLE_LABEL[o.role]}</span>
            </p>
            <UsageLine org={o} className="pt-0.5" />
          </div>
        </div>
      </div>
    )
  }

  // 複数ワークスペース: 切り替えドロップダウン
  const triggerTitle = active
    ? active.name
    : 'すべてのワークスペース'
  const triggerSub = active
    ? [ROLE_LABEL[active.role], '表示中'].join(' · ')
    : '一覧（絞り込みなし）'

  if (variant === 'headerControl') {
    return (
      <div className={cn('w-full max-w-full', className)}>
        <p className="mb-1.5 text-[10px] font-medium tracking-wide text-muted-foreground">現在のワークスペース</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full min-w-0 max-w-full items-stretch justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/40',
                contextBlockControl,
                navigating && 'pointer-events-none opacity-70'
              )}
              aria-label="ワークスペースを切り替える"
              aria-haspopup="menu"
              disabled={navigating}
            >
              <div className="flex min-h-0 min-w-0 flex-1 items-start gap-2 pr-0.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border/50 bg-background/70">
                  {navigating ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p
                    className="line-clamp-2 break-words text-sm font-medium text-foreground/95 leading-snug"
                    title={navigating ? undefined : triggerTitle}
                  >
                    {navigating ? '切り替え中…' : triggerTitle}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 break-words">{triggerSub}</p>
                </div>
              </div>
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 self-start text-muted-foreground/80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={cn('min-w-52', fullWidth ? 'max-w-[min(100vw-2rem,36rem)]' : 'w-52')}
            style={fullWidth ? { width: 'var(--radix-popper-anchor-width)' } : undefined}
          >
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">ワークスペース</DropdownMenuLabel>
            <DropdownMenuItem asChild className="p-0" disabled={navigating}>
              <Link
                href="/projects"
                className="w-full cursor-pointer rounded-sm px-2 py-2.5 text-sm text-foreground block leading-snug"
              >
                すべてのプロジェクト一覧
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {organizations.map((o) => {
              const isCurrent = o.id === activeOrganizationId
              return (
                <DropdownMenuItem
                  key={o.id}
                  className={cn('cursor-pointer p-0', isCurrent && 'bg-muted/60 focus:bg-muted/60')}
                  disabled={navigating}
                  onSelect={() => {
                    void switchToWorkspace(o.id)
                  }}
                >
                  <div className="flex w-full items-center gap-2 px-2 py-2.5">
                    {isCurrent ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <span className="inline-block w-3.5 shrink-0" aria-hidden />
                    )}
                    <span className={cn('truncate text-sm', isCurrent ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                      {o.name}
                    </span>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className={cn('w-full max-w-full', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full min-w-0 max-w-full items-stretch justify-between gap-2 rounded-xl border-2 border-primary/15 bg-gradient-to-b from-primary/[0.06] to-card px-3.5 py-3 text-left text-sm shadow-sm transition-[opacity,box-shadow] hover:shadow-md',
              contextBlock,
              navigating && 'pointer-events-none opacity-70'
            )}
            aria-label="ワークスペースを切り替える"
            aria-haspopup="menu"
            disabled={navigating}
          >
            <div className="flex min-h-0 min-w-0 flex-1 items-start gap-2.5 pr-0.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                {navigating ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">ワークスペース</p>
                <p
                  className="line-clamp-2 break-words font-semibold text-foreground leading-snug"
                  title={navigating ? undefined : triggerTitle}
                >
                  {navigating ? '切り替え中…' : triggerTitle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 break-words">{triggerSub}</p>
                {showUsageForActive && active && <UsageLine org={active} className="pt-0.5" />}
              </div>
            </div>
            <ChevronDown className="mt-1.5 h-4 w-4 shrink-0 self-start text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn('min-w-52', fullWidth ? 'max-w-[min(100vw-2rem,36rem)]' : 'w-52')}
          style={fullWidth ? { width: 'var(--radix-popper-anchor-width)' } : undefined}
        >
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">ワークスペース</DropdownMenuLabel>
          <DropdownMenuItem asChild className="p-0" disabled={navigating}>
            <Link
              href="/projects"
              className="w-full cursor-pointer rounded-sm px-2 py-2.5 text-sm text-foreground block leading-snug"
            >
              すべてのプロジェクト一覧
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {organizations.map((o) => {
            const isCurrent = o.id === activeOrganizationId
            return (
              <DropdownMenuItem
                key={o.id}
                className={cn('cursor-pointer p-0', isCurrent && 'bg-muted/60 focus:bg-muted/60')}
                disabled={navigating}
                onSelect={() => {
                  void switchToWorkspace(o.id)
                }}
              >
                <div className="flex w-full items-center gap-2 px-2 py-2.5">
                  {isCurrent ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <span className="inline-block w-3.5 shrink-0" aria-hidden />
                  )}
                  <span className={cn('truncate text-sm', isCurrent ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                    {o.name}
                  </span>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
