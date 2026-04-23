import { NextResponse } from 'next/server'
import { getCurrentSessionContext } from '@/lib/auth/get-current-session'

/**
 * 現在の Supabase セッションに対応するアプリユーザーを返す（初回は `users` に upsert）。
 */
export async function GET() {
  try {
    const ctx = await getCurrentSessionContext()
    if (!ctx) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    return NextResponse.json({
      user: {
        id: ctx.appUser.id,
        email: ctx.appUser.email,
        name: ctx.appUser.name,
      },
    })
  } catch (e) {
    console.error('[GET /api/auth/me]', e)
    return NextResponse.json({ message: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
  }
}
