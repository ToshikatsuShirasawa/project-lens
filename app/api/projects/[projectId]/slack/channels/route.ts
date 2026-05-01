import { NextResponse } from 'next/server'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { decryptSlackToken } from '@/lib/slack/token-crypto'
import { listPublicSlackChannels } from '@/lib/slack/client'
import { getLatestSlackConnectionForOrganization } from '@/lib/slack/connections'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    const connection = await getLatestSlackConnectionForOrganization(access.ctx.project.organizationId)
    if (!connection) {
      return NextResponse.json({ connected: false, channels: [] })
    }

    const token = decryptSlackToken(connection.botTokenEncrypted)
    const channels = await listPublicSlackChannels(token)
    return NextResponse.json({
      connected: true,
      teamName: connection.teamName,
      channels,
    })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/slack/channels]', e)
    return NextResponse.json({ message: 'Slackチャンネル一覧の取得に失敗しました' }, { status: 500 })
  }
}
