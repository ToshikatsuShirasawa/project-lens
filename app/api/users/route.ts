import { NextResponse } from 'next/server'
import { requireAppUserJson } from '@/lib/auth/require-app-user'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/users
 * アプリ内の全ユーザー（デバッグ等）。メンバー追加候補は
 * `GET /api/projects/[projectId]/member-candidates` を使う（workspace 境界あり）。
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
