import { NextResponse } from 'next/server'
import {
  ProjectInputType,
  SlackImportRangePreset,
  SlackImportStatus,
} from '@/lib/generated/prisma/client'
import { requireProjectAccessJson } from '@/lib/auth/require-project-access'
import { prisma } from '@/lib/prisma'
import { decryptSlackToken } from '@/lib/slack/token-crypto'
import { fetchSlackChannelHistory, listVisibleSlackChannels } from '@/lib/slack/client'
import { getSlackUserConnectionForProjectUser } from '@/lib/slack/connections'
import {
  formatSlackImportTitle,
  formatSlackMessagesForProjectInput,
  slackRangeToTimestamps,
} from '@/lib/slack/import-format'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

const RANGE_FROM_API: Record<string, SlackImportRangePreset> = {
  LAST_24_HOURS: SlackImportRangePreset.LAST_24_HOURS,
  LAST_3_DAYS: SlackImportRangePreset.LAST_3_DAYS,
  LAST_7_DAYS: SlackImportRangePreset.LAST_7_DAYS,
  LAST_14_DAYS: SlackImportRangePreset.LAST_14_DAYS,
  LAST_30_DAYS: SlackImportRangePreset.LAST_30_DAYS,
  LAST_60_DAYS: SlackImportRangePreset.LAST_60_DAYS,
  LAST_90_DAYS: SlackImportRangePreset.LAST_90_DAYS,
}

function serializeImport(row: {
  id: string
  channelName: string
  channelType: string
  rangePreset: SlackImportRangePreset
  messageCount: number
  status: SlackImportStatus
  projectInputId: string | null
  createdAt: Date
}) {
  return {
    id: row.id,
    channelName: row.channelName,
    channelType: row.channelType,
    rangePreset: row.rangePreset,
    messageCount: row.messageCount,
    status: row.status,
    projectInputId: row.projectInputId,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    const rows = await prisma.slackImport.findMany({
      where: {
        projectId: access.ctx.project.id,
        importedByUserId: access.ctx.appUser.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        channelName: true,
        channelType: true,
        rangePreset: true,
        messageCount: true,
        status: true,
        projectInputId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ imports: rows.map(serializeImport) })
  } catch (e) {
    console.error('[GET /api/projects/[projectId]/slack/imports]', e)
    return NextResponse.json({ message: 'Slack取り込み履歴の取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  let importId: string | null = null
  try {
    const { projectId } = await context.params
    const access = await requireProjectAccessJson(projectId)
    if (!access.ok) return access.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const channelId = typeof raw.channelId === 'string' ? raw.channelId.trim() : ''
    const rangeRaw = typeof raw.rangePreset === 'string' ? raw.rangePreset.trim().toUpperCase() : ''
    const rangePreset = RANGE_FROM_API[rangeRaw]
    if (!channelId || !rangePreset) {
      return NextResponse.json({ message: 'channelId と rangePreset は必須です' }, { status: 400 })
    }

    const connection = await getSlackUserConnectionForProjectUser({
      userId: access.ctx.appUser.id,
      organizationId: access.ctx.project.organizationId,
    })
    if (!connection) {
      return NextResponse.json({ message: 'Slackアカウントが未接続です' }, { status: 409 })
    }

    const token = decryptSlackToken(connection.userTokenEncrypted)
    const channels = await listVisibleSlackChannels(token)
    const channel = channels.find((item) => item.id === channelId)
    if (!channel) {
      return NextResponse.json({ message: '対象チャンネルが見つかりません' }, { status: 404 })
    }

    const { oldestTs, latestTs } = slackRangeToTimestamps(rangePreset)
    const createdImport = await prisma.slackImport.create({
      data: {
        projectId: access.ctx.project.id,
        userConnectionId: connection.id,
        channelId,
        channelName: channel.name,
        channelType: channel.type,
        rangePreset,
        oldestTs,
        latestTs,
        status: SlackImportStatus.RUNNING,
        importedByUserId: access.ctx.appUser.id,
      },
      select: { id: true },
    })
    importId = createdImport.id

    const messages = await fetchSlackChannelHistory({ token, channelId, oldestTs, latestTs })
    if (messages.length === 0) {
      const updated = await prisma.slackImport.update({
        where: { id: createdImport.id },
        data: {
          status: SlackImportStatus.SUCCESS,
          messageCount: 0,
          projectInputId: null,
        },
        select: {
          id: true,
          channelName: true,
          channelType: true,
          rangePreset: true,
          messageCount: true,
          status: true,
          projectInputId: true,
          createdAt: true,
        },
      })

      return NextResponse.json({ import: serializeImport(updated) }, { status: 201 })
    }

    if (messages.length > 0) {
      await prisma.slackMessage.createMany({
        data: messages.map((message) => ({
          userConnectionId: connection.id,
          projectId: access.ctx.project.id,
          importId: createdImport.id,
          channelId,
          channelName: channel.name,
          channelType: channel.type,
          messageTs: message.ts,
          threadTs: message.threadTs ?? null,
          userId: message.userId ?? null,
          userName: message.userName ?? null,
          text: message.text,
          permalink: null,
        })),
        skipDuplicates: true,
      })
    }

    const title = formatSlackImportTitle(channel.name, rangePreset)
    const formattedBody = formatSlackMessagesForProjectInput(channel.name, rangePreset, messages)
    const submittedBy = access.ctx.appUser.name?.trim() || access.ctx.appUser.email.trim()

    const projectInput = await prisma.projectInput.create({
      data: {
        projectId: access.ctx.project.id,
        inputType: ProjectInputType.SLACK,
        title,
        body: formattedBody,
        sourceLabel: 'Slack連携',
        submittedBy,
        submittedByUserId: access.ctx.appUser.id,
      },
      select: { id: true },
    })

    const updated = await prisma.slackImport.update({
      where: { id: createdImport.id },
      data: {
        status: SlackImportStatus.SUCCESS,
        messageCount: messages.length,
        projectInputId: projectInput.id,
      },
      select: {
        id: true,
        channelName: true,
        channelType: true,
        rangePreset: true,
        messageCount: true,
        status: true,
        projectInputId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ import: serializeImport(updated) }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/projects/[projectId]/slack/imports]', e)
    if (importId) {
      await prisma.slackImport.update({
        where: { id: importId },
        data: {
          status: SlackImportStatus.FAILED,
          errorMessage: e instanceof Error ? e.message.slice(0, 500) : 'unknown error',
        },
      }).catch(() => undefined)
    }
    return NextResponse.json({ message: 'Slackメッセージの取り込みに失敗しました' }, { status: 500 })
  }
}
