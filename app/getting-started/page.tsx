'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, LogOut, Mail, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { POST_LOGIN_DEFAULT } from '@/lib/auth/paths'
import { toastError, toastSuccess } from '@/lib/operation-toast'
import type { MeApiResponse, OrganizationCreateResponse } from '@/lib/types'

function sectionBox(className?: string) {
  return cn('rounded-lg border border-border bg-card/80 p-5 shadow-sm', className)
}

function GettingStartedForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [gate, setGate] = useState<'load' | 'ok' | 'forbidden'>('load')
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!res.ok) {
          if (!c) {
            setGate('forbidden')
            router.replace(`/login?next=${encodeURIComponent('/getting-started')}`)
          }
          return
        }
        const me = (await res.json()) as MeApiResponse
        if (c) return
        if (!me.user) {
          setGate('forbidden')
          router.replace(`/login?next=${encodeURIComponent('/getting-started')}`)
          return
        }
        if (me.needsOnboarding === false) {
          router.replace(POST_LOGIN_DEFAULT)
          return
        }
        if (me.canCreateOrganization === false) {
          router.replace(POST_LOGIN_DEFAULT)
          return
        }
        setGate('ok')
      } catch {
        if (!c) setGate('ok')
      }
    })()
    return () => {
      c = true
    }
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n || submitted) return
    setSubmitted(true)
    setMessage(null)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n }),
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
      const org = body as OrganizationCreateResponse
      toastSuccess(`「${org.name}」を作成しました`)
      router.push(POST_LOGIN_DEFAULT)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '作成に失敗しました'
      setMessage(msg)
      toastError(msg)
    } finally {
      setSubmitted(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (e) {
      console.error('[getting-started] signOut', e)
    } finally {
      setSigningOut(false)
    }
  }

  if (gate === 'load') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        確認しています…
      </div>
    )
  }

  if (gate === 'forbidden') {
    return <p className="text-sm text-muted-foreground">リダイレクトしています…</p>
  }

  return (
    <div className="w-full max-w-lg space-y-6 text-left">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">まだワークスペースに参加していません</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          利用するには、ワークスペースを作成するか、招待から参加してください。
        </p>
      </div>

      <div className={sectionBox()}>
        <div className="flex gap-2">
          <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-1 min-w-0">
            <h2 className="text-sm font-medium text-foreground">招待で参加する</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              同僚・管理者が送った<strong className="text-foreground/90">招待リンク</strong>（メールやチャットに貼ってある URL）を開いてください。招待リンクを開くと、そのまま参加できます。まだ届いていない場合は、共有を依頼してから戻るのが安全です。
            </p>
          </div>
        </div>
      </div>

      <div className={sectionBox()}>
        <div className="flex gap-2 mb-3">
          <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">自分でワークスペースを作成する</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              自社・自チーム用の枠を今すぐ用意する場合は、以下から名前を決めて作成してください。あとでメンバーを招いたり、名称を変えたりできます。
            </p>
          </div>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3 pl-0 sm:pl-7">
          <div className="space-y-2">
            <Label htmlFor="org-name" className="text-muted-foreground">
              ワークスペース名
            </Label>
            <Input
              id="org-name"
              type="text"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 社内IT推進、〇〇事業部"
              minLength={1}
              maxLength={200}
              disabled={submitted}
            />
          </div>
          {message && (
            <p className="text-sm text-destructive" role="alert">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full sm:w-auto" disabled={submitted || !name.trim()}>
            {submitted ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中
              </>
            ) : (
              'この名前でワークスペースを作成'
            )}
          </Button>
        </form>
      </div>

      <div className={sectionBox('bg-muted/20')}>
        <div className="flex gap-2">
          <LogOut className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-3 min-w-0">
            <h2 className="text-sm font-medium text-foreground">招待を待つ</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              先に案内のメールを待ちたい場合は、このまま少し置いておくこともできます。すでに別のメールアドレスで登録している方は、いったん抜けて入り直してください。同じアカウントに戻る場合は、招待が来たあと、もう一度この画面の案内に従うと進めます。
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
            >
              {signingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  切り替え中…
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  別のアカウントでログインする
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/20">
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">ProjectLens</span>
      </div>
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground" aria-hidden>
            読み込み中…
          </div>
        }
      >
        <GettingStartedForm />
      </Suspense>
    </div>
  )
}
