const LAST_VISITED_PROJECTS_STORAGE_KEY = 'projectlens:last-visited-projects'

type LastVisitedProjectsMap = Record<string, string>

function readLastVisitedProjects(): LastVisitedProjectsMap {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(LAST_VISITED_PROJECTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const map: LastVisitedProjectsMap = {}
    for (const [organizationId, projectId] of Object.entries(parsed)) {
      if (typeof organizationId === 'string' && typeof projectId === 'string' && organizationId && projectId) {
        map[organizationId] = projectId
      }
    }
    return map
  } catch {
    return {}
  }
}

function writeLastVisitedProjects(value: LastVisitedProjectsMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_VISITED_PROJECTS_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // localStorage is unavailable in some environments.
  }
}

export function getLastVisitedProjectId(organizationId: string): string | null {
  if (!organizationId) return null
  const map = readLastVisitedProjects()
  return map[organizationId] ?? null
}

export function setLastVisitedProjectId(organizationId: string, projectId: string): void {
  if (!organizationId || !projectId) return
  const current = readLastVisitedProjects()
  current[organizationId] = projectId
  writeLastVisitedProjects(current)
}
