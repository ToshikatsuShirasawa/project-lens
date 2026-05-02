import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { decodeSlackOAuthState, isSafeReturnTo } from '@/lib/slack/oauth-state'
import { exchangeSlackOAuthCode } from '@/lib/slack/client'
import { encryptSlackToken } from '@/lib/slack/token-crypto'
import { prisma } from '@/lib/prisma'
import { requireAppUserJson } from '@/lib/auth/require-app-user'

export async function GET(request: NextRequest) {
  const fallbackRedirect = new URL('/projects', request.nextUrl.origin)

  try {
    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response

    const code = request.nextUrl.searchParams.get('code')?.trim()
    const stateRaw = request.nextUrl.searchParams.get('state')?.trim()
    if (!code || !stateRaw) {
      return NextResponse.json({ message: 'Slack OAuth callback が不正です' }, { status: 400 })
    }

    const state = decodeSlackOAuthState(stateRaw)
    const cookieStore = await cookies()
    const nonceCookie = cookieStore.get('projectlens_slack_oauth_nonce')?.value
    if (
      !state ||
      state.userId !== auth.ctx.appUser.id ||
      !nonceCookie ||
      state.nonce !== nonceCookie ||
      Date.now() - state.issuedAt > 10 * 60 * 1000
    ) {
      return NextResponse.json({ message: 'Slack OAuth state が不正です' }, { status: 400 })
    }

    const redirectUri =
      process.env.SLACK_REDIRECT_URI || `${request.nextUrl.origin}/api/slack/oauth/callback`
    const tokenResult = await exchangeSlackOAuthCode({ code, redirectUri })
    const encryptedToken = encryptSlackToken(tokenResult.userToken)

    await prisma.slackUserConnection.upsert({
      where: {
        userId_organizationId: {
          userId: auth.ctx.appUser.id,
          organizationId: state.organizationId,
        },
      },
      create: {
        userId: auth.ctx.appUser.id,
        organizationId: state.organizationId,
        teamId: tokenResult.teamId,
        teamName: tokenResult.teamName,
        slackUserId: tokenResult.slackUserId,
        slackUserName: tokenResult.slackUserName,
        userTokenEncrypted: encryptedToken,
        scope: tokenResult.scope,
      },
      update: {
        organizationId: state.organizationId,
        teamName: tokenResult.teamName,
        slackUserId: tokenResult.slackUserId,
        slackUserName: tokenResult.slackUserName,
        userTokenEncrypted: encryptedToken,
        scope: tokenResult.scope,
      },
    })

    const redirectTo = isSafeReturnTo(state.returnTo) ? state.returnTo : `/o/${state.organizationId}/projects`
    const response = NextResponse.redirect(new URL(`${redirectTo}?slack=connected`, request.nextUrl.origin))
    response.cookies.delete('projectlens_slack_oauth_nonce')
    return response
  } catch (e) {
    console.error('[GET /api/slack/oauth/callback]', e)
    return NextResponse.redirect(new URL('/projects?slack=error', fallbackRedirect))
  }
}
