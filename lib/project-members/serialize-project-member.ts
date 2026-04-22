import type { ProjectMemberApiRecord } from '@/lib/types'

/** GET / POST / PATCH で共通する project_members + user の JSON 形 */
export function projectMemberToApiRecord(m: {
  id: string
  role: ProjectMemberApiRecord['role']
  user: { id: string; name: string | null; email: string }
}): ProjectMemberApiRecord {
  return {
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }
}
