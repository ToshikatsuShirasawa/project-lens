import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export interface SlackOAuthStatePayload {
  organizationId: string
  nonce: string
  issuedAt: number
  returnTo?: string
}

function getStateSecret(): string {
  const secret = process.env.SLACK_OAUTH_STATE_SECRET || process.env.SLACK_TOKEN_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('SLACK_OAUTH_STATE_SECRET or SLACK_TOKEN_ENCRYPTION_KEY is not set')
  }
  return secret
}

function signPayload(payload: string): string {
  return createHmac('sha256', getStateSecret()).update(payload).digest('base64url')
}

export function createSlackOAuthNonce(): string {
  return randomBytes(16).toString('base64url')
}

export function encodeSlackOAuthState(payload: SlackOAuthStatePayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${encodedPayload}.${signPayload(encodedPayload)}`
}

export function decodeSlackOAuthState(state: string): SlackOAuthStatePayload | null {
  const [encodedPayload, signature] = state.split('.')
  if (!encodedPayload || !signature) return null
  const expected = signPayload(encodedPayload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SlackOAuthStatePayload
    if (!parsed.organizationId || !parsed.nonce || typeof parsed.issuedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function isSafeReturnTo(value: string | undefined): value is string {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}
