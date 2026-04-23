import { NextResponse } from 'next/server'
import { getCurrentSessionContext } from '@/lib/auth/get-current-session'
import type { CurrentSessionContext } from '@/lib/auth/get-current-session'

export type AppUserAuthResult =
  | { ok: true; ctx: CurrentSessionContext }
  | { ok: false; response: NextResponse }

/**
 * JSON API 用: 未ログインは 401（middleware がページを保護する前提の裏側用）。
 * project 配下の操作は `requireProjectAccessJson` / `requireProjectAccessForTaskJson` を使う。
 */
export async function requireAppUserJson(): Promise<AppUserAuthResult> {
  const ctx = await getCurrentSessionContext()
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ message: '認証が必要です' }, { status: 401 }),
    }
  }
  return { ok: true, ctx }
}
