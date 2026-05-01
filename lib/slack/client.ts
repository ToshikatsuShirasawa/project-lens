export interface SlackChannel {
  id: string
  name: string
  isArchived?: boolean
}

export interface SlackHistoryMessage {
  ts: string
  threadTs?: string
  userId?: string
  userName?: string
  text: string
}

export interface SlackOAuthAccessResult {
  teamId: string
  teamName: string
  botUserId: string | null
  botToken: string
}

interface SlackApiBaseResponse {
  ok: boolean
  error?: string
  response_metadata?: { next_cursor?: string }
}

interface SlackOAuthResponse extends SlackApiBaseResponse {
  access_token?: string
  bot_user_id?: string
  team?: { id?: string; name?: string }
}

interface SlackConversationsListResponse extends SlackApiBaseResponse {
  channels?: Array<{ id?: string; name?: string; is_archived?: boolean; is_channel?: boolean }>
}

interface SlackHistoryResponse extends SlackApiBaseResponse {
  messages?: Array<{ ts?: string; thread_ts?: string; user?: string; username?: string; text?: string; subtype?: string }>
}

interface SlackUserInfoResponse extends SlackApiBaseResponse {
  user?: { id?: string; name?: string; real_name?: string; profile?: { display_name?: string; real_name?: string } }
}

async function readSlackJson<T extends SlackApiBaseResponse>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | null
  if (!body) throw new Error('Slack API response is not JSON')
  if (!response.ok || !body.ok) {
    throw new Error(body.error || `Slack API request failed: HTTP ${response.status}`)
  }
  return body
}

async function slackApiGet<T extends SlackApiBaseResponse>(
  token: string,
  method: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(`https://slack.com/api/${method}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return readSlackJson<T>(response)
}

export async function exchangeSlackOAuthCode(args: {
  code: string
  redirectUri: string
}): Promise<SlackOAuthAccessResult> {
  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('SLACK_CLIENT_ID and SLACK_CLIENT_SECRET are required')
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
  })
  const body = await readSlackJson<SlackOAuthResponse>(response)
  if (!body.access_token || !body.team?.id || !body.team.name) {
    throw new Error('Slack OAuth response does not include bot token or team')
  }
  return {
    teamId: body.team.id,
    teamName: body.team.name,
    botUserId: body.bot_user_id ?? null,
    botToken: body.access_token,
  }
}

export async function listPublicSlackChannels(token: string): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = []
  let cursor = ''

  do {
    const body = await slackApiGet<SlackConversationsListResponse>(token, 'conversations.list', {
      types: 'public_channel',
      exclude_archived: true,
      limit: 200,
      cursor: cursor || undefined,
    })
    for (const channel of body.channels ?? []) {
      if (!channel.id || !channel.name) continue
      channels.push({ id: channel.id, name: channel.name, isArchived: channel.is_archived ?? false })
    }
    cursor = body.response_metadata?.next_cursor ?? ''
  } while (cursor)

  return channels.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchSlackChannelHistory(args: {
  token: string
  channelId: string
  oldestTs: string
  latestTs: string
}): Promise<SlackHistoryMessage[]> {
  const messages: SlackHistoryMessage[] = []
  let cursor = ''

  do {
    const body = await slackApiGet<SlackHistoryResponse>(args.token, 'conversations.history', {
      channel: args.channelId,
      oldest: args.oldestTs,
      latest: args.latestTs,
      inclusive: true,
      limit: 200,
      cursor: cursor || undefined,
    })
    for (const message of body.messages ?? []) {
      if (!message.ts || !message.text || message.subtype) continue
      messages.push({
        ts: message.ts,
        threadTs: message.thread_ts,
        userId: message.user,
        userName: message.username,
        text: message.text,
      })
    }
    cursor = body.response_metadata?.next_cursor ?? ''
  } while (cursor)

  const users = await fetchSlackUserNames(args.token, Array.from(new Set(messages.map((m) => m.userId).filter(Boolean) as string[])))
  return messages
    .map((message) => ({
      ...message,
      userName: message.userName || (message.userId ? users.get(message.userId) : undefined),
    }))
    .sort((a, b) => Number(a.ts) - Number(b.ts))
}

async function fetchSlackUserNames(token: string, userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  for (const userId of userIds) {
    try {
      const body = await slackApiGet<SlackUserInfoResponse>(token, 'users.info', { user: userId })
      const user = body.user
      const name = user?.profile?.display_name || user?.profile?.real_name || user?.real_name || user?.name
      if (name) result.set(userId, name)
    } catch {
      // User name lookup is best-effort; message import can continue with user IDs.
    }
  }
  return result
}
