'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2 } from 'lucide-react'
import { KanbanColumnsSettings } from '@/components/settings/kanban-columns-settings'
import { dispatchProjectUpdated } from '@/lib/project-events'
import { isProjectManagerRoleApi, type ProjectApiRecord, type ProjectMemberRoleApi } from '@/lib/types'

interface ProjectSettingsPanelProps {
  projectId: string
}

export function ProjectSettingsPanel({ projectId }: ProjectSettingsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [myProjectRole, setMyProjectRole] = useState<ProjectMemberRoleApi | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`)
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
      const row = body as ProjectApiRecord
      setName(row.name)
      setDescription(row.description ?? '')
      setMyProjectRole(row.myProjectRole ?? 'MEMBER')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async () => {
    const nameTrim = name.trim()
    if (!nameTrim || saving) return

    setSaveError(null)
    setSaveOk(false)
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrim,
          description: description.trim() || null,
        }),
      })
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
      const row = body as ProjectApiRecord
      setName(row.name)
      setDescription(row.description ?? '')
      setMyProjectRole(row.myProjectRole ?? 'MEMBER')
      dispatchProjectUpdated(projectId)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    )
  }

  const canManage = isProjectManagerRoleApi(myProjectRole)

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>プロジェクト基本情報</CardTitle>
          <CardDescription>名前と説明は DB に保存されます（詳細なステータス等は今後拡張予定です）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManage ? (
            <p className="text-sm text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
              基本設定の変更は、プロジェクトの<strong className="text-foreground">管理者</strong>または
              <strong className="text-foreground">オーナー</strong>のみが行えます。閲覧は可能です。
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="settings-project-name">プロジェクト名</Label>
            <Input
              id="settings-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving || !canManage}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-project-desc">説明</Label>
            <Textarea
              id="settings-project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={saving || !canManage}
            />
          </div>
          {saveError && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
          {saveOk && <p className="text-sm text-muted-foreground">保存しました。</p>}
          <Button
            className="mt-2"
            type="button"
            onClick={() => void handleSave()}
            disabled={!name.trim() || saving || !canManage}
          >
            {saving ? '保存中…' : '変更を保存'}
          </Button>
        </CardContent>
      </Card>

      <KanbanColumnsSettings projectId={projectId} canManage={canManage} />

      <Card className="bg-card border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">危険な操作</CardTitle>
          <CardDescription>この操作は取り消すことができません</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="gap-2" type="button" disabled title="未実装">
            <Trash2 className="h-4 w-4" />
            プロジェクトを削除
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
