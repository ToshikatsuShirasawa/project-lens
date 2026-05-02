import { NextRequest, NextResponse } from 'next/server'
import { requireAppUserJson } from '@/lib/auth/require-app-user'
import { prisma } from '@/lib/prisma'
import {
  createSlackOAuthNonce,
  encodeSlackOAuthState,
  isSafeReturnTo,
} from '@/lib/slack/oauth-state'

const SLACK_USER_SCOPES = [
  'channels:read',
  'channels:history',
  'groups:read',
  'groups:history',
  'users:read',
  'team:read',
].join(',')

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response

    const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim()
    if (!organizationId) {
      return NextResponse.json({ message: 'organizationId が必要です' }, { status: 400 })
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: auth.ctx.appUser.id },
      select: { id: true },
    })
    if (!membership) {
      return NextResponse.json({ message: 'このワークスペースにアクセスする権限がありません' }, { status: 403 })
    }

    const clientId = process.env.SLACK_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ message: 'SLACK_CLIENT_ID が未設定です' }, { status: 500 })
    }

    const redirectUri =
      process.env.SLACK_REDIRECT_URI || `${request.nextUrl.origin}/api/slack/oauth/callback`
    const nonce = createSlackOAuthNonce()
    const returnToRaw = request.nextUrl.searchParams.get('returnTo') ?? undefined
    const state = encodeSlackOAuthState({
      organizationId,
      userId: auth.ctx.appUser.id,
      nonce,
      issuedAt: Date.now(),
      returnTo: isSafeReturnTo(returnToRaw) ? returnToRaw : undefined,
    })

    const authorizeUrl = new URL('https://slack.com/oauth/v2/authorize')
    authorizeUrl.searchParams.set('client_id', clientId)
    authorizeUrl.searchParams.set('user_scope', SLACK_USER_SCOPES)
    authorizeUrl.searchParams.set('redirect_uri', redirectUri)
    authorizeUrl.searchParams.set('state', state)

    const response = NextResponse.redirect(authorizeUrl)
    response.cookies.set('projectlens_slack_oauth_nonce', nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 10 * 60,
    })
    return response
  } catch (e) {
    console.error('[GET /api/slack/oauth/start]', e)
    return NextResponse.json({ message: 'Slack OAuth の開始に失敗しました' }, { status: 500 })
  }
}
