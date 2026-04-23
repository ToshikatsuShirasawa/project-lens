'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { getSafeNextPath, POST_LOGIN_DEFAULT } from '@/lib/auth/paths'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/operation-toast'
import type {
  MeApiResponse,
  ProjectInvitationAcceptResponse,
  ProjectInvitationPreviewResponse,
} from '@/lib/types'

const ROLE_JA: Record<ProjectInvitationPreviewResponse['role'], string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  MEMBER: 'メンバー',
}

function InviteContent() {
  const params = useParams()
  const router = useRouter()
  const tokenParam = params.token
  const token = typeof tokenParam === 'string' ? tokenParam : Array.isArray(tokenParam) ? tokenParam[0] : ''
  const tokenEnc = token ? encodeURIComponent(token) : ''

  const [preview, setPreview] = useState<ProjectInvitationPreviewResponse | null>(null)
  /** `null` = まだ /api/auth/me の結果前（読み込み中）。以降はゲスト/ログイン済が確定 */
  const [me, setMe] = useState<MeApiResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const thisPath = token ? `/invite/${tokenEnc}` : '/invite'
  const nextParam = thisPath
  const loginHref = `/login?next=${encodeURIComponent(nextParam)}`
  const signupHref = `/signup?next=${encodeURIComponent(nextParam)}`

  const load = useCallback(async () => {
    if (!token) {
      setLoadError('トークンがありません')
      return
    }
    setLoadError(null)
    setMe(null)
    try {
      const [pRes, mRes] = await Promise.all([
        fetch(`/api/invitations/${tokenEnc}`),
        fetch('/api/auth/me'),
      ])
      if (!pRes.ok) {
        const b: unknown = await pRes.json().catch(() => null)
        const msg =
          b &&
          typeof b === 'object' &&
          'message' in b &&
          typeof (b as { message: unknown }).message === 'string'
            ? (b as { message: string }).message
            : '招待の取得に失敗しました'
        setPreview(null)
        setLoadError(msg)
        setMe(
          mRes.ok
            ? ((await mRes.json()) as MeApiResponse)
            : {
                user: null,
                hasOrganization: false,
                needsOnboarding: false,
                canCreateOrganization: false,
              }
        )
        return
      }
      const pBody = (await pRes.json()) as ProjectInvitationPreviewResponse
      setPreview(pBody)
      const mBody: MeApiResponse = mRes.ok
        ? ((await mRes.json()) as MeApiResponse)
        : {
            user: null,
            hasOrganization: false,
            needsOnboarding: false,
            canCreateOrganization: false,
          }
      setMe(mBody)
    } catch (e) {
      setPreview(null)
      setLoadError(e instanceof Error ? e.message : '読み込みに失敗しました')
    }
  }, [token, tokenEnc])

  useEffect(() => {
    void load()
  }, [load])

  const sessionReady = me !== null
  const authed = Boolean(me?.user)
  const emailMatches =
    authed && preview && me?.user
      ? me.user.email.toLowerCase().trim() === preview.email.toLowerCase().trim()
      : false

  const handleJoin = async () => {
    if (!token || !emailMatches || !preview || preview.status !== 'PENDING') return
    setSubmitting(true)
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
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
      const data = body as ProjectInvitationAcceptResponse
      toastSuccess('プロジェクトに参加しました')
      router.push(getSafeNextPath(`/projects/${data.projectId}/kanban`, POST_LOGIN_DEFAULT))
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '参加に失敗しました'
      toastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive" role="alert">
        招待リンクの形式が不正です。
      </p>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-3 text-center max-w-sm">
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
        <Link href="/login" className="text-sm text-primary underline-offset-2 hover:underline">
          ログインへ
        </Link>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        読み込み中…
      </div>
    )
  }

  const statusNote =
    preview.status === 'PENDING'
      ? 'この招待に参加できます。'
      : preview.status === 'ACCEPTED'
        ? 'この招待は受諾済みです。'
        : preview.status === 'REVOKED'
          ? 'この招待は取り消されました。'
          : preview.status === 'EXPIRED'
            ? '有効期限切れです。'
            : 'この招待は利用できません。'

  return (
    <div className="w-full max-w-md space-y-6 text-left">
      <div className="border border-border rounded-lg bg-card p-6 space-y-4 shadow-sm">
        <h1 className="text-lg font-semibold">プロジェクト招待</h1>
        <p className="text-sm text-muted-foreground">{statusNote}</p>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">プロジェクト</dt>
            <dd className="font-medium text-foreground">{preview.projectName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ロール</dt>
            <dd>{ROLE_JA[preview.role]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">招待先メール</dt>
            <dd className="break-all">{preview.email}</dd>
          </div>
        </dl>
        {preview.status === 'PENDING' ? (
          !sessionReady ? (
            <div
              className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted/30 py-3 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              認証状態を確認しています…
            </div>
          ) : !authed ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="w-full sm:flex-1">
                <Link href={loginHref}>ログインして参加</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full sm:flex-1">
                <Link href={signupHref}>アカウント登録</Link>
              </Button>
            </div>
          ) : emailMatches ? (
            <Button
              type="button"
              className="w-full"
              disabled={submitting}
              onClick={() => void handleJoin()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中
                </>
              ) : (
                '参加する'
              )}
            </Button>
          ) : (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm space-y-1"
              role="alert"
            >
              <p className="text-destructive font-medium">この招待は別のメールアドレス宛です</p>
              <p className="text-muted-foreground text-xs break-all">
                招待先: {preview.email}
                <br />
                現在のログイン: {me?.user?.email}
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                <Link href={loginHref} className="text-primary underline-offset-2 hover:underline">
                  正しいアカウントでログインし直す
                </Link>
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}

export default function InvitePage() {
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
        <InviteContent />
      </Suspense>
    </div>
  )
}
