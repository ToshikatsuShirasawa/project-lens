'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSafeNextPath, postLoginPathFromMe, POST_LOGIN_DEFAULT } from '@/lib/auth/paths'
import type { MeApiResponse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const em = email.trim()
    if (!em || !password) return
    if (password.length < 6) {
      setMessage('パスワードは6文字以上にしてください（Supabase の制約に従います）')
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password,
        options: {
          emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
        },
      })
      if (error) {
        setMessage(error.message)
        return
      }
      if (data.session) {
        const next = searchParams.get('next')
        let fallback = POST_LOGIN_DEFAULT
        if (next == null) {
          const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
          if (meRes.ok) {
            const me = (await meRes.json()) as MeApiResponse
            if (me.user) {
              fallback = postLoginPathFromMe(me.needsOnboarding)
            }
          }
        }
        router.push(getSafeNextPath(next, fallback))
        router.refresh()
        return
      }
      setMessage('確認メールのリンクを開くか、管理設定で「メール確認不要」の場合に再度ログインしてください。')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const nextQ = searchParams.get('next')
  const loginHref = nextQ ? `/login?next=${encodeURIComponent(nextQ)}` : '/login'

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex items-center justify-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">ProjectLens</span>
      </div>
      <div className="border border-border rounded-lg bg-card p-6 space-y-4 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold">サインアップ</h1>
          <p className="text-sm text-muted-foreground mt-1">メールとパスワードで登録</p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">メール</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={submitting}
            />
          </div>
          {message && (
            <p className="text-sm text-muted-foreground leading-relaxed" role="status">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送信中
              </>
            ) : (
              '登録'
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          既にアカウントがある方は{' '}
          <Link href={loginHref} className="text-primary underline-offset-2 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/20">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground" aria-hidden>
            読み込み中…
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  )
}
