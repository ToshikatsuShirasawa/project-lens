interface OrgRef {
  id: string
  slug?: string | null
}

/** Returns the URL segment used to identify an org (currently id; switch to slug when routing is ready). */
export function orgUrlSegment(org: OrgRef): string {
  // TODO: return org.slug ?? org.id once slug-based routing is fully deployed
  return encodeURIComponent(org.id)
}

/** Returns the base path for an org, e.g. /o/[segment] */
export function orgBasePath(org: OrgRef): string {
  return `/o/${orgUrlSegment(org)}`
}
