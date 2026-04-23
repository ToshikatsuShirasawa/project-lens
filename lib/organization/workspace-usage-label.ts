import type { OrganizationMembershipApiRecord } from '@/lib/types'

/**
 * /projects や workspace switcher 用。短文で「上限 · 使用 · 残り」を出す
 */
export function workspaceProjectUsageLabel(
  o: Pick<OrganizationMembershipApiRecord, 'projectLimit' | 'projectCount' | 'remainingProjectCount'>
): string {
  if (o.projectLimit === null) {
    return 'プロジェクト: 制限なし'
  }
  const cap = o.projectLimit < 0 ? 0 : o.projectLimit
  const rem = o.remainingProjectCount ?? Math.max(0, cap - o.projectCount)
  return `${cap}件中 ${o.projectCount}件使用 · あと${rem}件`
}
