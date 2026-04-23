/**
 * workspace 切替後の遷移先:
 * 1) 当該 workspace の last visited project があれば dashboard へ
 * 2) 無ければ従来どおり workspace ホームへ
 */
import { getLastVisitedProjectId } from '@/lib/organization/last-visited-project'

export function resolveWorkspaceSwitchHref(organizationId: string): string {
  const lastVisitedProjectId = getLastVisitedProjectId(organizationId)
  if (lastVisitedProjectId) {
    return `/projects/${encodeURIComponent(lastVisitedProjectId)}/dashboard`
  }
  return `/workspace?organizationId=${encodeURIComponent(organizationId)}`
}
