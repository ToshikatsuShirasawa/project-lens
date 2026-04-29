import { createHash } from 'crypto'

export function generateCandidateKey(projectId: string, title: string): string {
  const normalized = normalizeTitle(title)
  const raw = `${projectId}:${normalized}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}
