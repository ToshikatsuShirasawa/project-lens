import { NextResponse } from 'next/server'
import { serializeProjectKanbanColumn } from '@/lib/kanban/serialize-kanban-column'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ projectId: string; columnId: string }>
}

const NAME_MAX = 120

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId, columnId } = await context.params
    const projectIdStr = projectId?.trim()
    const columnIdStr = columnId?.trim()
    if (!projectIdStr || !columnIdStr) {
      return NextResponse.json({ message: 'projectId または columnId が不正です' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const nameRaw = (body as Record<string, unknown>).name
    if (typeof nameRaw !== 'string') {
      return NextResponse.json({ message: 'name が必要です' }, { status: 400 })
    }
    const nameTrim = nameRaw.trim()
    if (!nameTrim) {
      return NextResponse.json({ message: 'name は空にできません' }, { status: 400 })
    }
    if (nameTrim.length > NAME_MAX) {
      return NextResponse.json({ message: `name は ${NAME_MAX} 文字以内にしてください` }, { status: 400 })
    }

    const existing = await prisma.projectKanbanColumn.findFirst({
      where: { id: columnIdStr, projectId: projectIdStr },
    })

    if (!existing) {
      return NextResponse.json({ message: '列が見つかりません' }, { status: 404 })
    }

    const updated = await prisma.projectKanbanColumn.update({
      where: { id: columnIdStr },
      data: { name: nameTrim },
    })

    return NextResponse.json(serializeProjectKanbanColumn(updated))
  } catch (e: unknown) {
    console.error('[PATCH /api/projects/[projectId]/kanban-columns/[columnId]]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2025') {
      return NextResponse.json({ message: '列が見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ message: '列の更新に失敗しました' }, { status: 500 })
  }
}
