'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { MeApiResponse } from '@/lib/types'

type UserAccountBarProps = {
  /** ページヘッダ用の1行レイアウト */
  variant?: 'default' | 'inline'
}

/**
 * サイドバー・一覧ヘッダ等に置ける。`/api/auth/me` と（ログアウト時）Supabase クライアントを使う。
 */
export function UserAccountBar({ variant = 'default' }: UserAccountBarProps) {
  const router = useRouter()
  const [me, setMe] = useState<MeApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me')
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        setMe(null)
        return
      }
      if (body && typeof body === 'object' && 'user' in body) {
        setMe(body as MeApiResponse)
      } else {
        setMe({ user: null })
      }
    } catch {
      setMe(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setMe({ user: null })
      router.push('/login')
      router.refresh()
    } catch (e) {
      console.error('[UserAccountBar] signOut', e)
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-2 min-h-9" aria-hidden>
        <User className="h-3.5 w-3.5 opacity-50" />
        読み込み中…
      </div>
    )
  }

  if (me?.user) {
    if (variant === 'inline') {
      return (
        <div className="flex items-center gap-2 min-w-0 max-w-[min(20rem,55vw)]">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span
            className="text-xs text-muted-foreground truncate"
            title={me.user.name?.trim() || me.user.email || undefined}
          >
            {(me.user.name && me.user.name.trim()) || me.user.email?.split('@')[0] || me.user.email}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs shrink-0"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            title="ログアウト"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
    const display =
      (me.user.name && me.user.name.trim()) || me.user.email?.split('@')[0] || me.user.email
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 min-w-0 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{display}</p>
            <p className="text-[11px] truncate" title={me.user.email ?? undefined}>
              {me.user.email}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          {signingOut ? 'ログアウト中…' : 'ログアウト'}
        </Button>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <Button asChild type="button" size="sm" variant="outline" className="h-8 text-xs">
        <Link href="/login" className="inline-flex items-center gap-1">
          <LogIn className="h-3.5 w-3.5" />
          ログイン
        </Link>
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed">ログインしてプロジェクトを紐づけます</p>
      <Button asChild type="button" size="sm" className="w-full h-8 text-xs" variant="secondary">
        <Link href="/login" className="inline-flex items-center justify-center">
          <LogIn className="h-3.5 w-3.5 mr-1" />
          ログイン
        </Link>
      </Button>
    </div>
  )
}
