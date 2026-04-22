'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dispatchKanbanColumnsUpdated } from '@/lib/project-events'
import type {
  ProjectKanbanColumnApi,
  ProjectKanbanColumnsListResponse,
  ProjectKanbanColumnsReorderRequest,
} from '@/lib/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface KanbanColumnsSettingsProps {
  projectId: string
}

function orderSignature(cols: ProjectKanbanColumnApi[]): string {
  return JSON.stringify(cols.map((c) => c.id))
}

export function KanbanColumnsSettings({ projectId }: KanbanColumnsSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [columns, setColumns] = useState<ProjectKanbanColumnApi[]>([])
  const [baselineOrder, setBaselineOrder] = useState('')
  const [names, setNames] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [rowOk, setRowOk] = useState<Record<string, boolean>>({})
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [reorderOk, setReorderOk] = useState(false)

  const orderDirty = useMemo(() => {
    if (!columns.length || !baselineOrder) return false
    return orderSignature(columns) !== baselineOrder
  }, [columns, baselineOrder])

  const busy = savingId !== null || reordering

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/kanban-columns`)
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
      const parsed = body && typeof body === 'object' ? body : null
      const cols =
        parsed && 'columns' in parsed && Array.isArray((parsed as { columns: unknown }).columns)
          ? ([...(parsed as { columns: ProjectKanbanColumnApi[] }).columns] as ProjectKanbanColumnApi[]).sort(
              (a, b) => a.sortOrder - b.sortOrder
            )
          : []
      setColumns(cols)
      setBaselineOrder(orderSignature(cols))
      setNames(Object.fromEntries(cols.map((c) => [c.id, c.name])))
      setRowErrors({})
      setRowOk({})
      setReorderError(null)
      setReorderOk(false)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const moveUp = (index: number) => {
    if (busy || index <= 0) return
    setColumns((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setReorderError(null)
    setReorderOk(false)
  }

  const moveDown = (index: number) => {
    if (busy || index >= columns.length - 1) return
    setColumns((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setReorderError(null)
    setReorderOk(false)
  }

  const handleSaveOrder = async () => {
    if (!orderDirty || busy) return

    const payload: ProjectKanbanColumnsReorderRequest = {
      columnIds: columns.map((c) => c.id),
    }

    setReorderError(null)
    setReorderOk(false)
    setReordering(true)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/kanban-columns/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
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
      const parsed = body as ProjectKanbanColumnsListResponse
      const cols = [...parsed.columns].sort((a, b) => a.sortOrder - b.sortOrder)
      setColumns(cols)
      setBaselineOrder(orderSignature(cols))
      setNames((prev) => {
        const next = { ...prev }
        for (const c of cols) {
          if (next[c.id] === undefined) next[c.id] = c.name
        }
        return next
      })
      dispatchKanbanColumnsUpdated(projectId)
      setReorderOk(true)
      setTimeout(() => setReorderOk(false), 2500)
    } catch (e) {
      setReorderError(e instanceof Error ? e.message : '並び順の保存に失敗しました')
    } finally {
      setReordering(false)
    }
  }

  const handleSaveRow = async (columnId: string) => {
    const nameTrim = (names[columnId] ?? '').trim()
    if (!nameTrim || busy) return

    const original = columns.find((c) => c.id === columnId)?.name ?? ''
    if (nameTrim === original) return

    setRowErrors((prev) => ({ ...prev, [columnId]: '' }))
    setSavingId(columnId)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/kanban-columns/${encodeURIComponent(columnId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameTrim }),
        }
      )
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
      const updated = body as ProjectKanbanColumnApi
      setColumns((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
      setNames((prev) => ({ ...prev, [updated.id]: updated.name }))
      dispatchKanbanColumnsUpdated(projectId)
      setRowOk((prev) => ({ ...prev, [columnId]: true }))
      setTimeout(() => {
        setRowOk((prev) => ({ ...prev, [columnId]: false }))
      }, 2000)
    } catch (e) {
      setRowErrors((prev) => ({
        ...prev,
        [columnId]: e instanceof Error ? e.message : '保存に失敗しました',
      }))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>カンバン列</CardTitle>
          <CardDescription>列の表示名・並び順を編集できます。</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>カンバン列</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>カンバン列</CardTitle>
        <CardDescription>
          表示名の変更と、↑↓による並び替えができます。並び替え後は「並び順を保存」で DB に反映されます。内部キー（key）は固定です。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {columns.map((col, index) => {
          const dirty = (names[col.id] ?? '').trim() !== col.name
          const saving = savingId === col.id
          return (
            <div
              key={col.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-stretch sm:justify-between"
            >
              <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || busy}
                  title="上へ"
                  aria-label={`「${col.key}」を上へ`}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveDown(index)}
                  disabled={index >= columns.length - 1 || busy}
                  title="下へ"
                  aria-label={`「${col.key}」を下へ`}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] text-muted-foreground font-mono">key: {col.key}</p>
                <div className="space-y-1.5">
                  <Label htmlFor={`kanban-col-name-${col.id}`} className="text-sm">
                    表示名
                  </Label>
                  <Input
                    id={`kanban-col-name-${col.id}`}
                    value={names[col.id] ?? ''}
                    onChange={(e) => setNames((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                {rowErrors[col.id] ? (
                  <p className="text-xs text-destructive" role="alert">
                    {rowErrors[col.id]}
                  </p>
                ) : null}
                {rowOk[col.id] ? <p className="text-xs text-muted-foreground">保存しました。</p> : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 self-end sm:self-end sm:mb-0.5"
                disabled={!dirty || !(names[col.id] ?? '').trim() || busy}
                onClick={() => void handleSaveRow(col.id)}
              >
                {saving ? '保存中…' : 'この列を保存'}
              </Button>
            </div>
          )
        })}

        {orderDirty ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">並び順が未保存です。カンバンへ反映するには保存してください。</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSaveOrder()}
                disabled={busy}
              >
                {reordering ? '保存中…' : '並び順を保存'}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>
                並び順を元に戻す
              </Button>
            </div>
          </div>
        ) : null}

        {reorderError ? (
          <p className="text-sm text-destructive" role="alert">
            {reorderError}
          </p>
        ) : null}
        {reorderOk ? <p className="text-sm text-muted-foreground">並び順を保存しました。</p> : null}
      </CardContent>
    </Card>
  )
}
