import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/users
 * 開発・オーナー指定用のユーザー一覧（認可なしの暫定）。
 */
export async function GET() {
  try {
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
