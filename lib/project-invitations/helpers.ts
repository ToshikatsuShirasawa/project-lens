import { randomBytes } from 'node:crypto'
import type { ProjectInvitation } from '@/lib/generated/prisma/client'
import type {
  ProjectInvitationApiRecord,
  ProjectInvitationStatusApi,
  ProjectMemberRoleApi,
} from '@/lib/types'

const INVITE_PATH_PREFIX = '/invite/'

export function normalizeInvitationEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function areInvitationEmailsEqual(a: string, b: string): boolean {
  return normalizeInvitationEmail(a) === normalizeInvitationEmail(b)
}

export function projectInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

/** 新規招待の有効期限（日） */
export const PROJECT_INVITATION_TTL_DAYS = 7

export function defaultInvitationExpiresAt(from = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + PROJECT_INVITATION_TTL_DAYS)
  return d
}

export function buildInvitePath(token: string): string {
  return `${INVITE_PATH_PREFIX}${encodeURIComponent(token)}`
}

export function projectInvitationToApiRecord(
  row: ProjectInvitation
): ProjectInvitationApiRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    organizationId: row.organizationId,
    email: row.email,
    role: row.role as ProjectMemberRoleApi,
    status: row.status as ProjectInvitationStatusApi,
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    invitedByUserId: row.invitedByUserId,
  }
}
