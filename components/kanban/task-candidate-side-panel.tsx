'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Plus, Pause, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskCandidate } from '@/lib/types'

interface TaskCandidateSidePanelProps {
  candidates: TaskCandidate[]
  onAddToKanban: (candidate: TaskCandidate) => void
  onHold: (id: string) => void
  onDismiss: (id: string) => void
}

const KANBAN_AI_PANEL_OPEN_STORAGE_KEY = 'projectlens:kanban-ai-panel-open'

const sourceConfig = {
  slack: { label: 'Slack', class: 'bg-emerald-100 text-emerald-700' },
  report: { label: '作業報告', class: 'bg-blue-100 text-blue-700' },
  meeting: { label: '議事録', class: 'bg-purple-100 text-purple-700' },
  ai: { label: 'AI検出', class: 'bg-primary/10 text-primary' },
}

export function TaskCandidateSidePanel({
  candidates,
  onAddToKanban,
  onHold,
  onDismiss,
}: TaskCandidateSidePanelProps) {
  const [open, setOpen] = useState(true)
  const [openStateLoaded, setOpenStateLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KANBAN_AI_PANEL_OPEN_STORAGE_KEY)
      if (stored === 'true') {
        setOpen(true)
      } else if (stored === 'false') {
        setOpen(false)
      }
    } catch {
      // localStorage may be unavailable; keep default behavior.
    } finally {
      setOpenStateLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!openStateLoaded) return
    try {
      window.localStorage.setItem(KANBAN_AI_PANEL_OPEN_STORAGE_KEY, String(open))
    } catch {
      // Ignore persistence failures and keep panel usable.
    }
  }, [open, openStateLoaded])

  if (!open) {
    return (
      <aside
        className="w-11 shrink-0 flex flex-col border-l border-border bg-ai-panel h-full"
        aria-label="AIタスク候補パネル（閉じています）"
      >
        <div className="flex flex-1 flex-col items-center gap-2 border-b border-border py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-primary"
            onClick={() => setOpen(true)}
            title="AIタスク候補を開く"
            aria-expanded={false}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">AIタスク候補を開く</span>
          </Button>
          <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden />
          {candidates.length > 0 ? (
            <Badge className="text-[10px] h-5 min-w-5 px-1 justify-center bg-primary/10 text-primary border-0">
              {candidates.length}
            </Badge>
          ) : null}
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="w-80 shrink-0 flex flex-col border-l border-border bg-ai-panel h-full"
      aria-label="AIタスク候補"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 pr-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">AIタスク候補</span>
        {candidates.length > 0 && (
          <Badge className="shrink-0 text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0">
            {candidates.length}件
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(false)}
          title="候補パネルを閉じる"
          aria-expanded={true}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">候補パネルを閉じる</span>
        </Button>
      </div>
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        承認するとカンバンに追加されます
      </p>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">候補はありません</p>
          </div>
        ) : (
          candidates.map((c) => {
            const src = sourceConfig[c.source]
            return (
              <Card key={c.id} className="bg-card shadow-sm">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-snug">{c.title}</p>
                    <Badge className={cn('shrink-0 text-[10px] h-4 px-1.5 border-0', src.class)}>
                      {src.label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      抽出理由
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.reason}</p>
                  </div>
                  {(c.suggestedAssignee || c.suggestedDueDate) && (
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      {c.suggestedAssignee && <span>担当候補: {c.suggestedAssignee}</span>}
                      {c.suggestedDueDate && <span>期限候補: {c.suggestedDueDate}</span>}
                    </div>
                  )}
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-1 text-xs h-7"
                      onClick={() => onAddToKanban(c)}
                    >
                      <Plus className="h-3 w-3" />
                      追加
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-7 px-2"
                      onClick={() => onHold(c.id)}
                      title="保留"
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs h-7 px-2 text-muted-foreground"
                      onClick={() => onDismiss(c.id)}
                      title="不要"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </aside>
  )
}
