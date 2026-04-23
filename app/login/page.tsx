'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSafeNextPath, POST_LOGIN_DEFAULT } from '@/lib/auth/paths'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromError = searchParams.get('error') === 'auth'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(fromError ? '認証に失敗しました' : null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const em = email.trim()
    if (!em || !password) return
    setSubmitting(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: em, password })
      if (error) {
        setMessage(error.message)
        return
      }
      const next = searchParams.get('next')
      router.push(getSafeNextPath(next, POST_LOGIN_DEFAULT))
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

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
          <h1 className="text-lg font-semibold">ログイン</h1>
          <p className="text-sm text-muted-foreground mt-1">Supabase Auth（メール・パスワード）</p>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          {message && (
            <p className="text-sm text-destructive" role="alert">
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
              'ログイン'
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          アカウントがない方は{' '}
          <Link
            href={(() => {
              const n = searchParams.get('next')
              return n ? `/signup?next=${encodeURIComponent(n)}` : '/signup'
            })()}
            className="text-primary underline-offset-2 hover:underline"
          >
            サインアップ
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/20">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground" aria-hidden>
            読み込み中…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
