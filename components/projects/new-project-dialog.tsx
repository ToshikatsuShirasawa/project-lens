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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { DEFAULT_KANBAN_TEMPLATE_KEY } from '@/lib/kanban/kanban-column-templates'
import { toastError, toastSuccess } from '@/lib/operation-toast'
import type { NewProjectFormState, ProjectApiRecord, ProjectCreateRequest } from '@/lib/types'

export interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const emptyForm: NewProjectFormState = {
  name: '',
  description: '',
  templateKey: DEFAULT_KANBAN_TEMPLATE_KEY,
}

/** 名前・説明・カンバンテンプレート。オーナーはセッションユーザー（なければレガシーと同様メンバーなしで作成） */
export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const router = useRouter()
  const baseId = useId()
  const [form, setForm] = useState<NewProjectFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(emptyForm)
      setError(null)
      setSubmitting(false)
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
      toastSuccess('プロジェクトを作成しました')
      onOpenChange(false)
      router.push(`/projects/${created.id}/kanban`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '作成に失敗しました'
      console.error('[projects] create', err)
      setError(msg)
      toastError(msg)
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
            名前・説明に加え、カンバンの初期列構成を選べます。ログイン中の場合、あなたがオーナー（OWNER）として
            メンバーに登録されます。
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
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  作成中…
                </>
              ) : (
                '作成してカンバンへ'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
