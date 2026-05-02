export interface SlackChannel {
  id: string
  name: string
  type: 'public_channel' | 'private_channel'
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
  slackUserId: string
  slackUserName: string | null
  userToken: string
  scope: string | null
}

export const SLACK_IMPORT_MESSAGE_LIMIT = 500

interface SlackApiBaseResponse {
  ok: boolean
  error?: string
  response_metadata?: { next_cursor?: string }
}

interface SlackOAuthResponse extends SlackApiBaseResponse {
  team?: { id?: string; name?: string }
  authed_user?: {
    id?: string
    access_token?: string
    scope?: string
  }
}

interface SlackConversationsListResponse extends SlackApiBaseResponse {
  channels?: Array<{
    id?: string
    name?: string
    is_archived?: boolean
    is_channel?: boolean
    is_group?: boolean
    is_private?: boolean
    is_member?: boolean
  }>
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
  const userToken = body.authed_user?.access_token
  const slackUserId = body.authed_user?.id
  if (!userToken || !slackUserId || !body.team?.id || !body.team.name) {
    throw new Error('Slack OAuth response does not include user token, user, or team')
  }
  const userName = await fetchSlackUserName(userToken, slackUserId)
  return {
    teamId: body.team.id,
    teamName: body.team.name,
    slackUserId,
    slackUserName: userName,
    userToken,
    scope: body.authed_user?.scope ?? null,
  }
}

export async function listVisibleSlackChannels(token: string): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = []
  let cursor = ''

  do {
    const body = await slackApiGet<SlackConversationsListResponse>(token, 'conversations.list', {
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 200,
      cursor: cursor || undefined,
    })
    for (const channel of body.channels ?? []) {
      if (!channel.id || !channel.name) continue
      if (channel.is_member === false) continue
      const type = channel.is_private || channel.is_group ? 'private_channel' : 'public_channel'
      channels.push({ id: channel.id, name: channel.name, type, isArchived: channel.is_archived ?? false })
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
  limit?: number
}): Promise<SlackHistoryMessage[]> {
  const messages: SlackHistoryMessage[] = []
  const maxMessages = args.limit ?? SLACK_IMPORT_MESSAGE_LIMIT
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
      if (messages.length >= maxMessages) break
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
  } while (cursor && messages.length < maxMessages)

  const users = await fetchSlackUserNames(args.token, Array.from(new Set(messages.map((m) => m.userId).filter(Boolean) as string[])))
  return messages
    .map((message) => ({
      ...message,
      userName: message.userName || (message.userId ? users.get(message.userId) : undefined),
    }))
    .sort((a, b) => Number(a.ts) - Number(b.ts))
}

async function fetchSlackUserName(token: string, userId: string): Promise<string | null> {
  const users = await fetchSlackUserNames(token, [userId])
  return users.get(userId) ?? null
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
