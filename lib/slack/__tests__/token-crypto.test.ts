import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptSlackToken, encryptSlackToken } from '../token-crypto'

const originalSecret = process.env.SLACK_TOKEN_ENCRYPTION_KEY

describe('Slack token crypto', () => {
  beforeEach(() => {
    process.env.SLACK_TOKEN_ENCRYPTION_KEY = 'test-token-encryption-secret'
  })

  afterEach(() => {
    process.env.SLACK_TOKEN_ENCRYPTION_KEY = originalSecret
  })

  it('Bot tokenを暗号化して復号できる', () => {
    const encrypted = encryptSlackToken('xoxb-secret-token')
    expect(encrypted).not.toContain('xoxb-secret-token')
    expect(decryptSlackToken(encrypted)).toBe('xoxb-secret-token')
  })
})
