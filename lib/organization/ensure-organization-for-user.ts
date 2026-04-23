import { OrganizationMemberRole, type Prisma } from '@/lib/generated/prisma/client'

type ClientOrTx = Prisma.TransactionClient

function workspaceNameFromUser(email: string | null, name: string | null): string {
  const n = name?.trim()
  if (n) return `${n} のワークスペース`
  const local = email?.split('@')[0]?.trim()
  if (local) return `${local} のワークスペース`
  return 'マイワークスペース'
}

/**
 * ログイン中ユーザーの利用先 organization を返す。
 * 所属 organization_members がなければ 1 件新規作成し、そのユーザーを OWNER で追加（Phase 1・案A）。
 */
export async function ensureOrganizationForCurrentUser(
  appUser: { id: string; email: string; name: string | null },
  tx: ClientOrTx
) {
  const first = await tx.organizationMember.findFirst({
    where: { userId: appUser.id },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
  if (first) {
    return first.organization
  }
  return tx.organization.create({
    data: {
      name: workspaceNameFromUser(appUser.email, appUser.name),
      members: {
        create: {
          userId: appUser.id,
          role: OrganizationMemberRole.OWNER,
        },
      },
    },
  })
}
