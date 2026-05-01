'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import type { ProjectInputTypeApi } from '@/lib/types'

interface ProjectInputFormProps {
  projectId: string
  onCreated?: () => void
}

export function ProjectInputForm({ projectId, onCreated }: ProjectInputFormProps) {
  const { toast } = useToast()
  const [inputType, setInputType] = useState<ProjectInputTypeApi>('MEETING')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const hasContent = body.trim().length > 0

  const handleSubmit = async () => {
    if (!hasContent || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType,
          title,
          body,
          sourceLabel: '手動入力',
        }),
      })

      if (!res.ok) {
        const responseBody: unknown = await res.json().catch(() => null)
        const message =
          responseBody && typeof responseBody === 'object' && 'message' in responseBody
            ? String((responseBody as { message: unknown }).message)
            : '保存に失敗しました'
        toast({ title: 'エラー', description: message, variant: 'destructive' })
        return
      }

      setTitle('')
      setBody('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
      toast({ title: '登録しました', description: 'AIタスク候補を更新します' })
      window.dispatchEvent(new CustomEvent('projectlens:reports-updated', { detail: { projectId } }))
      onCreated?.()
    } catch {
      toast({ title: 'エラー', description: 'ネットワークエラーが発生しました', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          メモを登録
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          議事録、会議メモ、打ち合わせメモなどをそのまま貼り付けてください。
          AIがタスク候補を抽出します。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">種類</label>
            <Select value={inputType} onValueChange={(value) => setInputType(value as ProjectInputTypeApi)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEETING">議事録</SelectItem>
                <SelectItem value="SLACK">Slackメモ</SelectItem>
                <SelectItem value="MEMO">メモ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">タイトル</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 4/30 定例メモ"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">本文</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="議事録やメモをそのまま貼り付けてください"
            rows={7}
            className="resize-y text-sm"
          />
        </div>
        <Button onClick={handleSubmit} disabled={!hasContent || isSubmitting} className="w-full gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : submitted ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {submitted ? '登録しました！' : '登録して候補を抽出'}
        </Button>
      </CardContent>
    </Card>
  )
}
