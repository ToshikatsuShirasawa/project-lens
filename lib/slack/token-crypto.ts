import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getEncryptionKey(): Buffer {
  const secret = process.env.SLACK_TOKEN_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('SLACK_TOKEN_ENCRYPTION_KEY is not set')
  }
  return createHash('sha256').update(secret).digest()
}

export function encryptSlackToken(token: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decryptSlackToken(encryptedToken: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = encryptedToken.split('.')
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted Slack token')
  }
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivRaw, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
