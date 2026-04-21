'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Share2, Hash } from 'lucide-react'
import type { ProjectMember } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProjectHeaderProps {
  projectName: string
  status: 'active' | 'paused' | 'completed' | '注意' | '遅延'
  lastUpdated: string
  channels: string[]
  members: ProjectMember[]
}

const statusConfig = {
  active: { label: '順調', className: 'bg-success/20 text-success border-0' },
  paused: { label: '一時停止', className: 'bg-muted text-muted-foreground border-0' },
  completed: { label: '完了', className: 'bg-primary/20 text-primary border-0' },
  注意: { label: '注意', className: 'bg-warning/20 text-warning border-0' },
  遅延: { label: '遅延', className: 'bg-destructive/20 text-destructive border-0' },
}

export function ProjectHeader({ projectName, status, lastUpdated, channels, members }: ProjectHeaderProps) {
  const cfg = statusConfig[status] ?? statusConfig['注意']
  const displayMembers = members.slice(0, 5)
  const extraCount = members.length - displayMembers.length

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6 gap-4">
      {/* Left: project name + status + channels */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">{projectName}</h1>
        <Badge className={cn('shrink-0 text-xs', cfg.className)}>{cfg.label}</Badge>
        <span className="hidden text-xs text-muted-foreground sm:block shrink-0">
          最終更新: {lastUpdated}
        </span>
        <div className="hidden items-center gap-1.5 lg:flex">
          {channels.map((ch) => (
            <Badge key={ch} variant="secondary" className="gap-1 text-xs">
              <Hash className="h-2.5 w-2.5" />
              {ch}
            </Badge>
          ))}
        </div>
      </div>

      {/* Right: members + share */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex -space-x-2">
          {displayMembers.map((m) => (
            <Avatar key={m.id} className="h-7 w-7 border-2 border-card">
              <AvatarFallback className="text-[10px] bg-secondary">
                {m.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
          {extraCount > 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
              +{extraCount}
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-2 text-xs">
          <Share2 className="h-3.5 w-3.5" />
          共有レポートを作成
        </Button>
      </div>
    </header>
  )
}
