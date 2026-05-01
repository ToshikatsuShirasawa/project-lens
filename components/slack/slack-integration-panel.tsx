'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Hash, Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

type SlackRangePreset = 'LAST_24_HOURS' | 'LAST_3_DAYS' | 'LAST_7_DAYS'
type SlackImportStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'

interface SlackChannel {
  id: string
  name: string
}

interface SlackImportRecord {
  id: string
  channelName: string
  rangePreset: SlackRangePreset
  messageCount: number
  status: SlackImportStatus
  projectInputId: string | null
  createdAt: string
}

interface SlackIntegrationPanelProps {
  projectId: string
  organizationId?: string
}

const rangeLabels: Record<SlackRangePreset, string> = {
  LAST_24_HOURS: '直近24時間',
  LAST_3_DAYS: '直近3日',
  LAST_7_DAYS: '直近7日',
}

const statusLabels: Record<SlackImportStatus, string> = {
  RUNNING: '取り込み中',
  SUCCESS: '成功',
  FAILED: '失敗',
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

export function SlackIntegrationPanel({ projectId, organizationId: organizationIdProp }: SlackIntegrationPanelProps) {
  const pathname = usePathname()
  const { toast } = useToast()
  const [organizationId, setOrganizationId] = useState(organizationIdProp ?? '')
  const [connected, setConnected] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [imports, setImports] = useState<SlackImportRecord[]>([])
  const [channelId, setChannelId] = useState('')
  const [rangePreset, setRangePreset] = useState<SlackRangePreset>('LAST_24_HOURS')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (organizationIdProp) {
      setOrganizationId(organizationIdProp)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`)
        const body: unknown = await res.json().catch(() => null)
        if (
          !cancelled &&
          res.ok &&
          body &&
          typeof body === 'object' &&
          'organizationId' in body &&
          typeof (body as { organizationId: unknown }).organizationId === 'string'
        ) {
          setOrganizationId((body as { organizationId: string }).organizationId)
        }
      } catch {
        // OAuth導線が必要になるまでorganizationIdなしで表示を継続する
      }
    })()
    return () => {
      cancelled = true
    }
  }, [organizationIdProp, projectId])

  const fetchChannels = useCallback(async () => {
    setError(null)
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/slack/channels`)
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      const msg =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : 'Slackチャンネル一覧の取得に失敗しました'
      throw new Error(msg)
    }
    const parsed = body as { connected?: boolean; teamName?: string; channels?: SlackChannel[] }
    setConnected(Boolean(parsed.connected))
    setTeamName(parsed.teamName ?? '')
    setChannels(parsed.channels ?? [])
    if (!channelId && parsed.channels?.[0]) setChannelId(parsed.channels[0].id)
  }, [projectId, channelId])

  const fetchImports = useCallback(async () => {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/slack/imports`)
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      const msg =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : 'Slack取り込み履歴の取得に失敗しました'
      throw new Error(msg)
    }
    setImports(((body as { imports?: SlackImportRecord[] }).imports ?? []) as SlackImportRecord[])
  }, [projectId])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([fetchChannels(), fetchImports()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Slack連携情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [fetchChannels, fetchImports])

  useEffect(() => {
    void reload()
  }, [reload])

  const connectHref = useMemo(() => {
    if (!organizationId) return '#'
    const params = new URLSearchParams({
      organizationId,
      returnTo: pathname,
    })
    return `/api/slack/oauth/start?${params.toString()}`
  }, [organizationId, pathname])

  const handleImport = async () => {
    if (!channelId || importing) return
    setImporting(true)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/slack/imports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, rangePreset }),
      })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: unknown }).message)
            : 'Slackメッセージの取り込みに失敗しました'
        throw new Error(msg)
      }
      toast({ title: '取り込みました', description: 'SlackログをAI候補抽出に反映しました' })
      window.dispatchEvent(new CustomEvent('projectlens:reports-updated', { detail: { projectId } }))
      await fetchImports()
    } catch (e) {
      toast({
        title: 'エラー',
        description: e instanceof Error ? e.message : 'Slackメッセージの取り込みに失敗しました',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-4 w-4 text-primary" />
            Slackから取り込む
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            public channel の会話を手動で取得し、AI候補抽出に使うテキストとして保存します。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              読み込み中...
            </div>
          ) : error ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => void reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                再読み込み
              </Button>
            </div>
          ) : !connected ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">
                Slack workspace がまだ接続されていません。接続すると public channel を選択して取り込めます。
              </p>
              <Button asChild disabled={!organizationId}>
                <a href={connectHref}>Slackに接続</a>
              </Button>
              <p className="text-xs text-muted-foreground">
                必要な権限: channels:read, channels:history, users:read, team:read
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">接続済み: {teamName}</Badge>
                <Button variant="ghost" size="sm" onClick={() => void reload()} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  更新
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">対象チャンネル</label>
                  <Select value={channelId} onValueChange={setChannelId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="チャンネルを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          #{channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">取得範囲</label>
                  <Select value={rangePreset} onValueChange={(value) => setRangePreset(value as SlackRangePreset)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAST_24_HOURS">直近24時間</SelectItem>
                      <SelectItem value="LAST_3_DAYS">直近3日</SelectItem>
                      <SelectItem value="LAST_7_DAYS">直近7日</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleImport} disabled={!channelId || importing} className="w-full gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                Slackから取り込む
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">取り込み済みSlackログ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {imports.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              まだSlackログの取り込み履歴がありません
            </div>
          ) : (
            imports.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    #{item.channelName} / {rangeLabels[item.rangePreset]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCreatedAt(item.createdAt)} / {item.messageCount}件 / {item.projectInputId ? 'AI候補抽出に反映済み' : '未反映'}
                  </p>
                </div>
                <Badge
                  variant={item.status === 'FAILED' ? 'destructive' : 'secondary'}
                  className={item.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : undefined}
                >
                  {statusLabels[item.status]}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
