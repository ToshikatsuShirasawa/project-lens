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
 * `POST /api/projects` 内: 紐づく organization を 1 件得る（既存メンバーシップの先頭企業を利用）。
 * 未所属のときの **自動作成**は後方互換用（プロジェクト API 直叩き等）。**推奨導線**は
 * `/getting-started` → `POST /api/organizations` による明示作成。将来ここを廃止しやすいよう分離。
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
  // Legacy: 未所属で最初の project を作ったときの自動スピン（GETTING_STARTED 未経由）
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
