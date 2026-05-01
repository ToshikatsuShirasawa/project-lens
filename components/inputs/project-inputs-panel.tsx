'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Clock, Loader2, MessageSquare, RefreshCw, StickyNote } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectInputForm } from '@/components/reports/project-input-form'
import type { ProjectInputApiRecord, ProjectInputListResponse, ProjectInputTypeApi } from '@/lib/types'

interface ProjectInputsPanelProps {
  projectId: string
}

const inputTypeConfig: Record<
  ProjectInputTypeApi,
  { label: string; icon: typeof MessageSquare; className: string }
> = {
  SLACK: { label: 'Slackメモ', icon: MessageSquare, className: 'bg-emerald-100 text-emerald-700' },
  MEETING: { label: '議事録', icon: BookOpen, className: 'bg-purple-100 text-purple-700' },
  MEMO: { label: 'メモ', icon: StickyNote, className: 'bg-amber-100 text-amber-700' },
}

function previewText(body: string): string {
  const compact = body.replace(/\s+/g, ' ').trim()
  if (compact.length <= 80) return compact
  return `${compact.slice(0, 79)}...`
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProjectInputsPanel({ projectId }: ProjectInputsPanelProps) {
  const [inputs, setInputs] = useState<ProjectInputApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInputs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/inputs`)
      if (!res.ok) {
        setError('登録済みの議事録・メモの取得に失敗しました')
        return
      }
      const body: ProjectInputListResponse = await res.json()
      setInputs(body.inputs ?? [])
    } catch {
      setError('登録済みの議事録・メモの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchInputs()
  }, [fetchInputs])

  return (
    <div className="space-y-6">
      <ProjectInputForm projectId={projectId} onCreated={() => void fetchInputs()} />

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            登録済みの議事録・メモ
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
            {!loading && error && (
              <button
                onClick={() => void fetchInputs()}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                aria-label="再読み込み"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ここに登録した内容は、ダッシュボードとカンバンのAI候補抽出に使われます。
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{error}</div>
          ) : inputs.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              まだ登録済みの議事録・メモがありません
            </div>
          ) : (
            inputs.map((input) => {
              const config = inputTypeConfig[input.inputType]
              const Icon = config.icon
              return (
                <div
                  key={input.id}
                  className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`h-5 border-0 px-2 text-[10px] ${config.className}`}>
                          <Icon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                        <span className="truncate text-sm font-medium text-foreground">
                          {input.title?.trim() || '無題'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {previewText(input.body)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80">
                        AI候補の抽出対象です
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      登録日時：{formatCreatedAt(input.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
