/**
 * 公開（ゲスト到達可）のページ、およびログイン直後 `next` の扱い。
 * Route Handler や middleware で共有する。
 */

/** ログイン完了後の既定遷移先 */
export const POST_LOGIN_DEFAULT = '/projects'

const AUTH_FLOW_PREFIX = '/auth'

/**
 * ゲストが到達してよいアプリ内パス名（/ は middleware 側で個別扱い）。
 * `/` はここに含めず、常に /login または /projects へ寄せる。
 */
export function isGuestAllowedPathname(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/signup') return true
  if (pathname === AUTH_FLOW_PREFIX || pathname.startsWith(`${AUTH_FLOW_PREFIX}/`)) return true
  return false
}

/**
 * `next` 検索パラメータ。オープンリダイレクトを避け、認証導線のループは避ける。
 */
export function getSafeNextPath(value: string | null | undefined, fallback = POST_LOGIN_DEFAULT): string {
  if (value == null) return fallback
  const t = value.trim()
  if (!t.startsWith('/') || t.startsWith('//') || t.includes('\0')) return fallback
  if (t === '/login' || t === '/signup' || t.startsWith(AUTH_FLOW_PREFIX + '/') || t === AUTH_FLOW_PREFIX) {
    return fallback
  }
  return t
}
