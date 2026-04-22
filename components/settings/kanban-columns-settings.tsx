'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dispatchKanbanColumnsUpdated } from '@/lib/project-events'
import { toastError, toastSuccess } from '@/lib/operation-toast'
import type {
  ProjectKanbanColumnApi,
  ProjectKanbanColumnDeleteResponse,
  ProjectKanbanColumnsListResponse,
  ProjectKanbanColumnsReorderRequest,
} from '@/lib/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

/** 有効列を先に（並び替え対象）、無効列を後ろに固定表示 */
function normalizeColumnsList(cols: ProjectKanbanColumnApi[]): ProjectKanbanColumnApi[] {
  const active = cols.filter((c) => !c.isArchived).sort((a, b) => a.sortOrder - b.sortOrder)
  const archived = cols.filter((c) => c.isArchived).sort((a, b) => a.sortOrder - b.sortOrder)
  return [...active, ...archived]
}

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
  const [togglingArchiveId, setTogglingArchiveId] = useState<string | null>(null)
  const [moveArchiveSourceId, setMoveArchiveSourceId] = useState<string | null>(null)
  const [moveArchiveTargetId, setMoveArchiveTargetId] = useState('')
  const [moveArchiveSubmitting, setMoveArchiveSubmitting] = useState(false)
  const [deleteTargetColumnId, setDeleteTargetColumnId] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const activeCount = useMemo(() => {
    const i = columns.findIndex((c) => c.isArchived)
    return i === -1 ? columns.length : i
  }, [columns])

  const orderDirty = useMemo(() => {
    if (!columns.length || !baselineOrder) return false
    return orderSignature(columns.slice(0, activeCount)) !== baselineOrder
  }, [columns, baselineOrder, activeCount])

  const busy =
    savingId !== null ||
    reordering ||
    togglingArchiveId !== null ||
    moveArchiveSubmitting ||
    deleteSubmitting

  const deleteTargetColumn = deleteTargetColumnId
    ? columns.find((c) => c.id === deleteTargetColumnId)
    : undefined

  const moveArchiveTargets = useMemo(() => {
    if (!moveArchiveSourceId) return []
    return columns
      .filter((c) => !c.isArchived && c.id !== moveArchiveSourceId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [columns, moveArchiveSourceId])

  const moveArchiveSourceCol = moveArchiveSourceId
    ? columns.find((c) => c.id === moveArchiveSourceId)
    : undefined

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/kanban-columns?includeArchived=true`
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
      const parsed = body && typeof body === 'object' ? body : null
      const raw =
        parsed && 'columns' in parsed && Array.isArray((parsed as { columns: unknown }).columns)
          ? ([...(parsed as { columns: ProjectKanbanColumnApi[] }).columns] as ProjectKanbanColumnApi[])
          : []
      const cols = normalizeColumnsList(raw)
      setColumns(cols)
      const nActive = cols.filter((c) => !c.isArchived).length
      setBaselineOrder(orderSignature(cols.slice(0, nActive)))
      setNames(Object.fromEntries(cols.map((c) => [c.id, c.name])))
      setRowErrors({})
      setRowOk({})
      setReorderError(null)
      setReorderOk(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '読み込みに失敗しました'
      console.error('[kanban-columns] load', e)
      setLoadError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const moveUp = (index: number) => {
    const ac = columns.findIndex((c) => c.isArchived)
    const maxI = ac === -1 ? columns.length : ac
    if (busy || index <= 0 || index >= maxI) return
    setColumns((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setReorderError(null)
    setReorderOk(false)
  }

  const moveDown = (index: number) => {
    const ac = columns.findIndex((c) => c.isArchived)
    const maxI = ac === -1 ? columns.length : ac
    if (busy || index >= maxI - 1 || index < 0) return
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
      columnIds: columns.slice(0, activeCount).map((c) => c.id),
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
      const actives = [...parsed.columns].sort((a, b) => a.sortOrder - b.sortOrder)
      setColumns((prev) => {
        const archived = prev.filter((c) => c.isArchived)
        return normalizeColumnsList([...actives, ...archived])
      })
      setBaselineOrder(orderSignature(actives))
      setNames((prev) => {
        const next = { ...prev }
        for (const c of actives) {
          if (next[c.id] === undefined) next[c.id] = c.name
        }
        return next
      })
      dispatchKanbanColumnsUpdated(projectId)
      setReorderOk(true)
      setTimeout(() => setReorderOk(false), 2500)
      toastSuccess('並び順を保存しました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '並び順の保存に失敗しました'
      console.error('[kanban-columns] reorder', e)
      setReorderError(msg)
      toastError(msg)
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
      toastSuccess('列名を保存しました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存に失敗しました'
      console.error('[kanban-columns] rename', e)
      setRowErrors((prev) => ({
        ...prev,
        [columnId]: msg,
      }))
      toastError(msg)
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleArchive = async (columnId: string, nextArchived: boolean) => {
    if (busy) return
    setRowErrors((prev) => ({ ...prev, [columnId]: '' }))
    setTogglingArchiveId(columnId)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/kanban-columns/${encodeURIComponent(columnId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isArchived: nextArchived }),
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
      let normalized: ProjectKanbanColumnApi[] = []
      setColumns((prev) => {
        const merged = prev.map((c) =>
          c.id === updated.id ? { ...c, ...updated, taskCount: nextArchived ? 0 : c.taskCount } : c
        )
        normalized = normalizeColumnsList(merged)
        return normalized
      })
      const nActive = normalized.filter((c) => !c.isArchived).length
      setBaselineOrder(orderSignature(normalized.slice(0, nActive)))
      setNames((prev) => ({ ...prev, [updated.id]: updated.name }))
      dispatchKanbanColumnsUpdated(projectId)
      toastSuccess(nextArchived ? '列を無効化しました' : '列を有効にしました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '更新に失敗しました'
      console.error('[kanban-columns] toggle archive', e)
      setRowErrors((prev) => ({
        ...prev,
        [columnId]: msg,
      }))
      toastError(msg)
    } finally {
      setTogglingArchiveId(null)
    }
  }

  const openMoveArchiveDialog = (sourceId: string) => {
    const targets = columns
      .filter((c) => !c.isArchived && c.id !== sourceId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    setRowErrors((prev) => ({ ...prev, [sourceId]: '' }))
    setMoveArchiveSourceId(sourceId)
    setMoveArchiveTargetId(targets[0]?.id ?? '')
  }

  const closeMoveArchiveDialog = () => {
    setMoveArchiveSourceId(null)
    setMoveArchiveTargetId('')
  }

  const openDeleteColumnDialog = (columnId: string) => {
    setRowErrors((prev) => ({ ...prev, [columnId]: '' }))
    setDeleteTargetColumnId(columnId)
  }

  const closeDeleteColumnDialog = () => {
    setDeleteTargetColumnId(null)
  }

  const handleDeleteColumnConfirm = async () => {
    if (!deleteTargetColumnId || deleteSubmitting) return
    setDeleteSubmitting(true)
    setRowErrors((prev) => ({ ...prev, [deleteTargetColumnId]: '' }))
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/kanban-columns/${encodeURIComponent(deleteTargetColumnId)}`,
        { method: 'DELETE' }
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
      const parsed = body as ProjectKanbanColumnDeleteResponse
      if (!parsed || parsed.deleted !== true) {
        throw new Error('応答が不正です')
      }
      closeDeleteColumnDialog()
      await load()
      dispatchKanbanColumnsUpdated(projectId)
      toastSuccess('列を削除しました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '削除に失敗しました'
      console.error('[kanban-columns] delete', e)
      setRowErrors((prev) => ({
        ...prev,
        [deleteTargetColumnId]: msg,
      }))
      toastError(msg)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleArchiveWithMoveSubmit = async () => {
    if (!moveArchiveSourceId || !moveArchiveTargetId || moveArchiveSubmitting) return
    setMoveArchiveSubmitting(true)
    setRowErrors((prev) => ({ ...prev, [moveArchiveSourceId]: '' }))
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/kanban-columns/${encodeURIComponent(moveArchiveSourceId)}/archive-with-move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetColumnId: moveArchiveTargetId }),
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
      closeMoveArchiveDialog()
      await load()
      dispatchKanbanColumnsUpdated(projectId)
      toastSuccess('タスクを移動して列を無効化しました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '移動と無効化に失敗しました'
      console.error('[kanban-columns] archive-with-move', e)
      setRowErrors((prev) => ({
        ...prev,
        [moveArchiveSourceId]: msg,
      }))
      toastError(msg)
    } finally {
      setMoveArchiveSubmitting(false)
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
          表示名の変更、有効 / 無効、↑↓による並び替え（有効列のみ）ができます。並び替え後は「並び順を保存」で DB
          に反映されます。内部キー（key）は固定です。タスクが残っている列は「移して無効化」で一括移動のうえ無効化できます。無効化済みの列は DB
          から削除できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog
          open={deleteTargetColumnId !== null}
          onOpenChange={(open) => {
            if (!open && !deleteSubmitting) closeDeleteColumnDialog()
          }}
        >
          <DialogContent showCloseButton={!deleteSubmitting}>
            <DialogHeader>
              <DialogTitle>列を完全に削除</DialogTitle>
              <DialogDescription>
                無効化済みの列「{deleteTargetColumn?.name ?? '…'}」をデータベースから物理削除します。この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            {deleteTargetColumnId && rowErrors[deleteTargetColumnId] ? (
              <p className="text-sm text-destructive" role="alert">
                {rowErrors[deleteTargetColumnId]}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={deleteSubmitting}
                onClick={() => closeDeleteColumnDialog()}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteSubmitting}
                onClick={() => void handleDeleteColumnConfirm()}
              >
                {deleteSubmitting ? '削除中…' : '削除する'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={moveArchiveSourceId !== null}
          onOpenChange={(open) => {
            if (!open && !moveArchiveSubmitting) closeMoveArchiveDialog()
          }}
        >
          <DialogContent showCloseButton={!moveArchiveSubmitting}>
            <DialogHeader>
              <DialogTitle>タスクを移して列を無効化</DialogTitle>
              <DialogDescription>
                「{moveArchiveSourceCol?.name ?? '…'}」のタスクをすべて選択した列の末尾へ移し、この列を無効化します。
              </DialogDescription>
            </DialogHeader>
            {moveArchiveSourceId && rowErrors[moveArchiveSourceId] ? (
              <p className="text-sm text-destructive" role="alert">
                {rowErrors[moveArchiveSourceId]}
              </p>
            ) : null}
            {moveArchiveTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                移動できる他の有効列がありません。列を有効に戻すか、プロジェクトに列を追加してから試してください。
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="move-archive-target">移動先の列</Label>
                <select
                  id="move-archive-target"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={moveArchiveTargetId}
                  onChange={(e) => setMoveArchiveTargetId(e.target.value)}
                  disabled={moveArchiveSubmitting}
                >
                  {moveArchiveTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}（key: {t.key}）
                    </option>
                  ))}
                </select>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={moveArchiveSubmitting}
                onClick={() => closeMoveArchiveDialog()}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                disabled={
                  moveArchiveSubmitting ||
                  moveArchiveTargets.length === 0 ||
                  !moveArchiveTargetId
                }
                onClick={() => void handleArchiveWithMoveSubmit()}
              >
                {moveArchiveSubmitting ? '実行中…' : '移動して無効化'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {columns.map((col, index) => {
          const dirty = (names[col.id] ?? '').trim() !== col.name
          const saving = savingId === col.id
          const toggling = togglingArchiveId === col.id
          const taskCount = col.taskCount ?? 0
          const cannotArchive = !col.isArchived && taskCount > 0
          const moveTargetsCount = columns.filter((c) => !c.isArchived && c.id !== col.id).length
          return (
            <Fragment key={col.id}>
              {index === activeCount && activeCount < columns.length ? (
                <p className="text-xs text-muted-foreground border-t border-border pt-3">
                  無効化された列（カンバン画面には表示されません）
                </p>
              ) : null}
              <div
                className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-stretch sm:justify-between ${
                  col.isArchived ? 'border-dashed border-muted-foreground/40 bg-muted/20' : 'border-border'
                }`}
              >
                <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveUp(index)}
                    disabled={index === 0 || busy || index >= activeCount}
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
                    disabled={busy || index >= columns.length - 1 || index >= activeCount - 1}
                    title="下へ"
                    aria-label={`「${col.key}」を下へ`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] text-muted-foreground font-mono">key: {col.key}</p>
                    {col.isArchived ? (
                      <Badge variant="secondary">無効</Badge>
                    ) : (
                      <Badge variant="default">有効</Badge>
                    )}
                  </div>
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
                  {cannotArchive ? (
                    <p className="text-xs text-muted-foreground">
                      タスクが {taskCount} 件あるため、そのままでは無効化できません。
                    </p>
                  ) : null}
                  {rowErrors[col.id] ? (
                    <p className="text-xs text-destructive" role="alert">
                      {rowErrors[col.id]}
                    </p>
                  ) : null}
                  {rowOk[col.id] ? <p className="text-xs text-muted-foreground">保存しました。</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 self-end sm:self-end sm:mb-0.5">
                  {col.isArchived ? (
                    <>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleToggleArchive(col.id, false)}
                      >
                        {toggling ? '処理中…' : '有効に戻す'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => openDeleteColumnDialog(col.id)}
                      >
                        列を削除
                      </Button>
                    </>
                  ) : (
                    <>
                      {cannotArchive ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy || moveTargetsCount === 0}
                          title={
                            moveTargetsCount === 0
                              ? '移動できる他の有効列がありません'
                              : 'タスクを別列へ移してからこの列を無効化'
                          }
                          onClick={() => openMoveArchiveDialog(col.id)}
                        >
                          移して無効化
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy || cannotArchive}
                        onClick={() => void handleToggleArchive(col.id, true)}
                      >
                        {toggling ? '処理中…' : '無効化'}
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!dirty || !(names[col.id] ?? '').trim() || busy}
                    onClick={() => void handleSaveRow(col.id)}
                  >
                    {saving ? '保存中…' : 'この列を保存'}
                  </Button>
                </div>
              </div>
            </Fragment>
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
