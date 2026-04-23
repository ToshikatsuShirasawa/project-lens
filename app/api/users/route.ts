import { NextResponse } from 'next/server'
import { requireAppUserJson } from '@/lib/auth/require-app-user'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/users
 * メンバー追加の候補用ユーザー一覧。認可は今後厳格化予定（暫定：全件）。
 */
export async function GET() {
  try {
    const r = await requireAppUserJson()
    if (!r.ok) return r.response

    const rows = await prisma.user.findMany({
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const users = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }))

    return NextResponse.json({ users })
  } catch (e) {
    console.error('[GET /api/users]', e)
    return NextResponse.json({ message: 'ユーザー一覧の取得に失敗しました' }, { status: 500 })
  }
}
