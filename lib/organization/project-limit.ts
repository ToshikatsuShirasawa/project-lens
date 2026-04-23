import type { Prisma, PrismaClient } from '@/lib/generated/prisma/client'

export type PrismaOrTx = PrismaClient | Prisma.TransactionClient

/**
 * `POST /api/projects` 等のレスポンス用（ユーザー向け）。定数化して将来 i18n 化しやすくする
 */
export const MSG_PROJECT_COUNT_LIMIT_REACHED =
  'このワークスペースでは作成できるプロジェクト数の上限に達しています。'

/**
 * `POST /api/projects` の 409 本文と照合。将来 API に `code` を足したらそちらを優先してもよい。
 * - 厳密一致に加え、「上限」系の文言差・`res.json()` 失敗で message が取れないケースも 409 なら制限に寄せる
 */
export function isProjectCountLimitResponse(status: number, apiMessage: string | undefined | null): boolean {
  if (status !== 409) return false
  const t = apiMessage?.trim() ?? ''
  if (t === '') {
    return true
  }
  if (t === MSG_PROJECT_COUNT_LIMIT_REACHED) {
    return true
  }
  return t.includes('上限') && (t.includes('プロジェクト') || t.includes('ワークスペース'))
}

/**
 * 上限に届いたとき。ルートの catch で 409 へマップ用。
 */
export class ProjectCountLimitError extends Error {
  constructor(message: string = MSG_PROJECT_COUNT_LIMIT_REACHED) {
    super(message)
    this.name = 'ProjectCountLimitError'
  }
}

/**
 * `prisma.$transaction` 内の throw は環境によって `instanceof` が偽になることがあるため、
 * name / message でも同一エラーとみなす（Route Handler で 500 に落ちないようにする）
 */
export function isThrownProjectCountLimitError(e: unknown): boolean {
  if (e instanceof ProjectCountLimitError) {
    return true
  }
  if (e !== null && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'ProjectCountLimitError') {
    return true
  }
  if (e instanceof Error) {
    const m = e.message
    if (m === MSG_PROJECT_COUNT_LIMIT_REACHED) {
      return true
    }
    if (m.includes('上限') && m.includes('プロジェクト')) {
      return true
    }
  }
  return false
}

export function projectCountLimitErrorMessage(e: unknown): string {
  if (e instanceof ProjectCountLimitError) {
    return e.message
  }
  if (e instanceof Error) {
    return e.message
  }
  return MSG_PROJECT_COUNT_LIMIT_REACHED
}

export type ProjectCreationAllowedResult = { allowed: true } | { allowed: false; message: string }

/**
 * 現在の `projects` 行数と `organization.projectLimit` から、あと1件作れるか。
 * `projectLimit === null` は無制限。`0` 以下の上限は 0 件扱いとみなす。
 */
export function evaluateProjectLimit(
  currentCount: number,
  projectLimit: number | null
): ProjectCreationAllowedResult {
  if (projectLimit === null) {
    return { allowed: true }
  }
  const cap = projectLimit < 0 ? 0 : projectLimit
  if (currentCount < cap) {
    return { allowed: true }
  }
  return { allowed: false, message: MSG_PROJECT_COUNT_LIMIT_REACHED }
}

const ORG_NOT_FOUND_FOR_LIMIT = 'ワークスペースが見つかりません'

/**
 * 作成可否の参照用（throw なし）。API の事前チェックで使ってもよい。
 */
export async function canCreateProjectInOrganization(
  organizationId: string,
  db: PrismaOrTx
): Promise<ProjectCreationAllowedResult> {
  const [org, count] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, projectLimit: true },
    }),
    db.project.count({ where: { organizationId } }),
  ])
  if (!org) {
    return { allowed: false, message: ORG_NOT_FOUND_FOR_LIMIT }
  }
  return evaluateProjectLimit(count, org.projectLimit)
}

/**
 * トランザクション内で organization を解決したあと、作成前に必ず通す想定。
 * 上限: `ProjectCountLimitError`（一般に 409）。紐づかない ID は従来どおり 500 用 `Error`。
 */
export async function assertProjectCreationAllowed(
  organizationId: string,
  db: PrismaOrTx
): Promise<void> {
  const r = await canCreateProjectInOrganization(organizationId, db)
  if (r.allowed) return
  if (r.message === ORG_NOT_FOUND_FOR_LIMIT) {
    throw new Error('organization が見つかりません')
  }
  throw new ProjectCountLimitError(r.message)
}
