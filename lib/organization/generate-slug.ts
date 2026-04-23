function toSlugBase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export async function generateUniqueOrgSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = toSlugBase(name) || `ws-${Math.random().toString(36).slice(2, 10)}`
  if (!(await checkExists(base))) return base
  for (let i = 2; i <= 9; i++) {
    const candidate = `${base.slice(0, 37)}-${i}`
    if (!(await checkExists(candidate))) return candidate
  }
  return `${base.slice(0, 30)}-${Math.random().toString(36).slice(2, 8)}`
}
