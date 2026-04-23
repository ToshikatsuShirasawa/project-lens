export function resolveWorkspaceSwitchHref(organizationId: string): string {
  return `/o/${encodeURIComponent(organizationId)}`
}
