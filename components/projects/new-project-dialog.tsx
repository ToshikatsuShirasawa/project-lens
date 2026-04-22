'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_KANBAN_TEMPLATE_KEY } from '@/lib/kanban/kanban-column-templates'
import type {
  NewProjectFormState,
  ProjectApiRecord,
  ProjectCreateRequest,
  UserApiRecord,
} from '@/lib/types'

export interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const OWNER_NONE_VALUE = '__none__'

function userOptionLabel(u: UserApiRecord): string {
  const n = u.name?.trim()
  if (n) return n
  return u.email.split('@')[0] ?? u.email
}

const emptyForm: NewProjectFormState = {
  name: '',
  description: '',
  templateKey: DEFAULT_KANBAN_TEMPLATE_KEY,
  ownerUserId: '',
}

/** 名前・説明・カンバンテンプレート。作成後はカンバンへ遷移 */
export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const router = useRouter()
  const baseId = useId()
  const [form, setForm] = useState<NewProjectFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ownerCandidates, setOwnerCandidates] = useState<UserApiRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersListError, setUsersListError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setForm(emptyForm)
      setError(null)
      setSubmitting(false)
      setUsersListError(null)
      return
    }

    let cancelled = false
    setUsersLoading(true)
    setUsersListError(null)
    void (async () => {
      try {
        const res = await fetch('/api/users')
        const body: unknown = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setOwnerCandidates([])
          const msg =
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
              ? (body as { message: string }).message
              : `ユーザー一覧を取得できませんでした（HTTP ${res.status}）`
          setUsersListError(msg)
          return
        }
        const parsed = body && typeof body === 'object' ? body : null
        const list =
          parsed && 'users' in parsed && Array.isArray((parsed as { users: unknown }).users)
            ? (parsed as { users: UserApiRecord[] }).users
            : []
        setOwnerCandidates(list)
      } catch {
        if (!cancelled) {
          setOwnerCandidates([])
          setUsersListError('ユーザー一覧の取得に失敗しました')
        }
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nameTrim = form.name.trim()
    if (!nameTrim || submitting) return

    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrim,
          description: form.description.trim() || undefined,
          templateKey: form.templateKey,
          ...(form.ownerUserId.trim()
            ? { ownerUserId: form.ownerUserId.trim() }
            : {}),
        } satisfies ProjectCreateRequest),
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
      const created = body as ProjectApiRecord
      if (!created?.id) {
        throw new Error('レスポンスが不正です')
      }
      onOpenChange(false)
      router.push(`/projects/${created.id}/kanban`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新規プロジェクト</DialogTitle>
          <DialogDescription>
            名前・説明に加え、カンバンの初期列構成を選べます。期限などはプロジェクト設定から後で編集できます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-name`}>プロジェクト名</Label>
            <Input
              id={`${baseId}-name`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例: 新規Webサイト"
              autoComplete="off"
              disabled={submitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-desc`}>説明（任意）</Label>
            <Textarea
              id={`${baseId}-desc`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="プロジェクトの概要"
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-owner`}>オーナー（任意）</Label>
            <Select
              value={form.ownerUserId.trim() ? form.ownerUserId.trim() : OWNER_NONE_VALUE}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, ownerUserId: v === OWNER_NONE_VALUE ? '' : v }))
              }
              disabled={submitting || usersLoading || ownerCandidates.length === 0}
            >
              <SelectTrigger id={`${baseId}-owner`} className="w-full">
                <SelectValue
                  placeholder={usersLoading ? '読み込み中…' : '未選択'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OWNER_NONE_VALUE}>未選択</SelectItem>
                {ownerCandidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {userOptionLabel(u)}
                    <span className="text-muted-foreground"> ({u.email})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {usersLoading ? (
              <p className="text-xs text-muted-foreground">ユーザーを読み込み中です…</p>
            ) : usersListError ? (
              <p className="text-xs text-destructive/90 leading-relaxed" role="status">
                {usersListError}
              </p>
            ) : ownerCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                ユーザーが未登録です。Prisma Studio 等で <code className="rounded bg-muted px-1">users</code>{' '}
                に行を追加すると、ここからオーナーを選べます。
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                選ぶと作成と同時に <code className="rounded bg-muted px-1">project_members</code>（OWNER）が1件作られ、カンバンの担当者候補に表示されます。
              </p>
            )}
          </div>
          <div className="space-y-2" role="radiogroup" aria-labelledby={`${baseId}-tpl-legend`}>
            <span id={`${baseId}-tpl-legend`} className="text-sm font-medium leading-none">
              カンバンのはじまり方
            </span>
            <div className="grid gap-2">
              <label
                htmlFor={`${baseId}-tpl-simple`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  id={`${baseId}-tpl-simple`}
                  type="radio"
                  name={`${baseId}-kanban-template`}
                  value="simple"
                  checked={form.templateKey === 'simple'}
                  onChange={() => setForm((f) => ({ ...f, templateKey: 'simple' }))}
                  disabled={submitting}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-medium">シンプル（3列）</span>
                  <span className="block text-xs text-muted-foreground leading-relaxed">
                    基本の3列で軽く管理するのに向いています。
                  </span>
                  <span className="block text-[11px] text-muted-foreground/90">
                    バックログ / 進行中 / 完了
                  </span>
                </span>
              </label>
              <label
                htmlFor={`${baseId}-tpl-review`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  id={`${baseId}-tpl-review`}
                  type="radio"
                  name={`${baseId}-kanban-template`}
                  value="review"
                  checked={form.templateKey === 'review'}
                  onChange={() => setForm((f) => ({ ...f, templateKey: 'review' }))}
                  disabled={submitting}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-medium">レビューあり（4列）</span>
                  <span className="block text-xs text-muted-foreground leading-relaxed">
                    レビュー工程を列として分けたい場合に。
                  </span>
                  <span className="block text-[11px] text-muted-foreground/90">
                    バックログ / 進行中 / レビュー / 完了
                  </span>
                </span>
              </label>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={!form.name.trim() || submitting}>
              {submitting ? '作成中…' : '作成してカンバンへ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
