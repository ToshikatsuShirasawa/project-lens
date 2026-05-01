import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decodeSlackOAuthState, encodeSlackOAuthState, isSafeReturnTo } from '../oauth-state'

const originalSecret = process.env.SLACK_OAUTH_STATE_SECRET

describe('Slack OAuth state', () => {
  beforeEach(() => {
    process.env.SLACK_OAUTH_STATE_SECRET = 'test-state-secret'
  })

  afterEach(() => {
    process.env.SLACK_OAUTH_STATE_SECRET = originalSecret
  })

  it('署名付きstateを復元できる', () => {
    const encoded = encodeSlackOAuthState({
      organizationId: 'org1',
      nonce: 'nonce1',
      issuedAt: 123,
      returnTo: '/o/org1/projects/p1/slack',
    })
    expect(decodeSlackOAuthState(encoded)).toEqual({
      organizationId: 'org1',
      nonce: 'nonce1',
      issuedAt: 123,
      returnTo: '/o/org1/projects/p1/slack',
    })
  })

  it('改ざんされたstateは拒否する', () => {
    const encoded = encodeSlackOAuthState({ organizationId: 'org1', nonce: 'nonce1', issuedAt: 123 })
    expect(decodeSlackOAuthState(`${encoded}x`)).toBeNull()
  })

  it('returnToは相対パスだけ許可する', () => {
    expect(isSafeReturnTo('/projects/p1/slack')).toBe(true)
    expect(isSafeReturnTo('https://example.com')).toBe(false)
    expect(isSafeReturnTo('//example.com')).toBe(false)
  })
})
