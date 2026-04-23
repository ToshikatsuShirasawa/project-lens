'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
}

const ROLE_LABEL: Record<OrganizationMembershipApiRecord['role'], string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  MEMBER: 'メンバー',
}

function UsageLine({ org, className }: { org: OrganizationMembershipApiRecord; className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground leading-relaxed', className)}>{workspaceProjectUsageLabel(org)}</p>
  )
}

export function WorkspaceSwitcher({
  activeOrganizationId,
  className,
  fullWidth = false,
}: WorkspaceSwitcherProps) {
  const [organizations, setOrganizations] = useState<OrganizationMembershipApiRecord[] | null>(null)
  const [loadError, setLoadError] = useState(false)

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

  if (organizations === null) {
    return (
      <div className={cn('rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground', fullWidth && 'w-full', className)}>
        読み込み中…
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className={cn('rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-destructive', fullWidth && 'w-full', className)}
        role="alert"
      >
        ワークスペースを読み込めませんでした
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground', fullWidth && 'w-full', className)}>
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
    return (
      <div
        className={cn('rounded-lg border border-border bg-muted/40 px-3 py-2.5', fullWidth && 'w-full', className)}
        role="region"
        aria-label="現在のワークスペース"
      >
        <div className="flex min-w-0 items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">ワークスペース</p>
            <p className="truncate font-medium text-foreground leading-snug">{o.name}</p>
            <p className="text-xs text-muted-foreground">
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

  return (
    <div className={cn(fullWidth && 'w-full', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted',
              fullWidth && 'w-full'
            )}
            aria-label="ワークスペースを切り替える"
            aria-haspopup="menu"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">ワークスペース</p>
                <p className="truncate font-medium text-foreground leading-snug">{triggerTitle}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{triggerSub}</p>
                {showUsageForActive && active && <UsageLine org={active} className="pt-0.5" />}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">別の表示に切り替え</DropdownMenuLabel>
          <DropdownMenuItem asChild className="p-0">
            <Link
              href="/projects"
              className="w-full cursor-pointer rounded-sm px-2 py-2.5 text-sm text-foreground block leading-snug"
            >
              すべてのワークスペースのプロジェクト
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">一覧をまとめて表示</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {organizations.map((o) => {
            const isCurrent = o.id === activeOrganizationId
            return (
              <DropdownMenuItem
                key={o.id}
                asChild
                className={cn('p-0', isCurrent && 'bg-muted/60 focus:bg-muted/60')}
              >
                <Link
                  href={`/projects?organizationId=${encodeURIComponent(o.id)}`}
                  className="flex flex-col items-stretch gap-0.5 px-2 py-2.5 w-full"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isCurrent ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <span className="inline-block w-3.5 shrink-0" aria-hidden />
                    )}
                    <span className={cn('truncate text-sm', isCurrent ? 'font-medium text-foreground' : 'font-medium text-foreground/90')}>
                      {o.name}
                    </span>
                  </span>
                  <span className="pl-[1.375rem] text-[11px] text-muted-foreground leading-tight">
                    {ROLE_LABEL[o.role]}
                  </span>
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
