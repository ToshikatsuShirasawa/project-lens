import type { Prisma } from '@/lib/generated/prisma/client'

/**
 * ProjectLens の認可ポリシー（Phase: org 導入直後・最小 RBAC）
 *
 * - **organization_members** … テナント（ワークスペース）境界。所属していなければ org 配下リソースに原則アクセス不可。
 * - **project_members** … その project を「使う」単位。一覧・操作は原則ここに含まれるユーザーのみ。
 *
 * 一覧（案A）: 上記 **両方** を満たす project のみ（`projectListWhereForUser`）。
 * 詳細・更新: 同じ二層を `requireProjectAccessJson` で検証（401 / 403 / 404）。
 *
 * 将来「org 所属なら全 PJ 閲覧」に広げる場合は一覧の where のみ差し替えやすい形にする。
 */

/** GET /api/projects 等: ログインユーザーが見てよい project の Prisma where（案A） */
export function projectListWhereForUser(userId: string): Prisma.ProjectWhereInput {
  return {
    AND: [
      { members: { some: { userId } } },
      { organization: { members: { some: { userId } } } },
    ],
  }
}
