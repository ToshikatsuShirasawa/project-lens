/**
 * workspace 切替後の遷移先: **常に当該 workspace ホーム**（`/workspace?organizationId=...`）。
 * project 数に応じた dashboard / 一覧分岐は行わない。
 */
export function resolveWorkspaceSwitchHref(organizationId: string): string {
  return `/workspace?organizationId=${encodeURIComponent(organizationId)}`
}
