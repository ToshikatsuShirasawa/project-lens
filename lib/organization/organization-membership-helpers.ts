import { OrganizationMemberRole, type Prisma, type PrismaClient } from '@/lib/generated/prisma/client'

/** Route Handler または `$transaction` 内 `tx` */
export type PrismaOrTx = PrismaClient | Prisma.TransactionClient

/**
 * いずれかの organization への所属があるか（招待の MEMBER 等を含む）。
 * `needsOnboarding` 判定用。
 */
export async function userHasAnyOrganizationMember(userId: string, db: PrismaOrTx): Promise<boolean> {
  const m = await db.organizationMember.findFirst({
    where: { userId },
    select: { id: true },
  })
  return Boolean(m)
}

/**
 * すでにいずれかの organization で OWNER か。
 * 新規 `POST /api/organizations` 可否: **false のときだけ**（将来プラン等で拡張しやすい名前）。
 */
export async function userIsOwnerInAnyOrganization(userId: string, db: PrismaOrTx): Promise<boolean> {
  const m = await db.organizationMember.findFirst({
    where: { userId, role: OrganizationMemberRole.OWNER },
    select: { id: true },
  })
  return Boolean(m)
}
