import { OrganizationMemberRole, type OrganizationMemberRole as PrismaOrgMemberRole } from '@/lib/generated/prisma/client'
import { NextResponse } from 'next/server'
import { requireAppUserJson } from '@/lib/auth/require-app-user'
import { prisma } from '@/lib/prisma'
import { userIsOwnerInAnyOrganization } from '@/lib/organization/organization-membership-helpers'
import { remainingProjectSlots } from '@/lib/organization/project-limit'
import { generateUniqueOrgSlug } from '@/lib/organization/generate-slug'
import type {
  OrganizationCreateRequest,
  OrganizationCreateResponse,
  OrganizationApiRecord,
  OrganizationListResponse,
  OrganizationMembershipApiRecord,
  OrganizationMemberRoleApi,
} from '@/lib/types'

function orgRoleToApi(r: PrismaOrgMemberRole): OrganizationMemberRoleApi {
  if (r === OrganizationMemberRole.OWNER) return 'OWNER'
  if (r === OrganizationMemberRole.ADMIN) return 'ADMIN'
  return 'MEMBER'
}

function toApiRecord(row: {
  id: string
  name: string
  slug: string | null
  projectLimit: number | null
  createdAt: Date
  updatedAt: Date
}): OrganizationApiRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    projectLimit: row.projectLimit,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const MSG_CONFLICT = 'すでに管理するワークスペースがあります。これ以上、新しい組織は作成できません。'

/**
 * GET /api/organizations
 * ログイン中ユーザーの所属 workspace のみ（一覧導線・切り替え用）
 */
export async function GET() {
  try {
    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response
    const userId = auth.ctx.appUser.id
    const rows = await prisma.organizationMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, projectLimit: true },
        },
      },
    })
    const orgIds = rows.map((m) => m.organization.id)
    const countByOrg =
      orgIds.length === 0
        ? (new Map<string, number>() as Map<string, number>)
        : new Map(
            (
              await prisma.project.groupBy({
                by: ['organizationId'],
                where: { organizationId: { in: orgIds } },
                _count: { _all: true },
              })
            ).map((r) => [r.organizationId, r._count._all] as const)
          )

    const organizations: OrganizationMembershipApiRecord[] = rows.map((m) => {
      const org = m.organization
      const projectCount = countByOrg.get(org.id) ?? 0
      const projectLimit = org.projectLimit
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: orgRoleToApi(m.role),
        projectLimit,
        projectCount,
        remainingProjectCount: remainingProjectSlots(projectLimit, projectCount),
      }
    })
    return NextResponse.json({ organizations } satisfies OrganizationListResponse)
  } catch (e) {
    console.error('[GET /api/organizations]', e)
    return NextResponse.json({ message: 'ワークスペース一覧の取得に失敗しました' }, { status: 500 })
  }
}

/**
 * POST /api/organizations
 * 認証必須。既に `organization_members.role === OWNER` の行がある場合は 409（1ユーザー1 OWNED枠制約）。
 * 同トランザクションで `organizations` 作成＋作成者を OWNER 追加。
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAppUserJson()
    if (!auth.ok) return auth.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON が不正です' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'リクエストボディが不正です' }, { status: 400 })
    }

    const nameRaw = (body as OrganizationCreateRequest).name
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : ''
    if (!name) {
      return NextResponse.json({ message: 'name が必要です' }, { status: 400 })
    }
    if (name.length > 200) {
      return NextResponse.json({ message: 'name は200文字以内にしてください' }, { status: 400 })
    }

    const userId = auth.ctx.appUser.id
    const slug = await generateUniqueOrgSlug(name, async (candidate) => {
      const existing = await prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } })
      return existing !== null
    })
    const created = await prisma.$transaction(async (tx) => {
      if (await userIsOwnerInAnyOrganization(userId, tx)) {
        return { conflict: true as const }
      }
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          members: {
            create: { userId, role: OrganizationMemberRole.OWNER },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          projectLimit: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      return { conflict: false as const, org }
    })

    if (created.conflict) {
      return NextResponse.json({ message: MSG_CONFLICT }, { status: 409 })
    }

    return NextResponse.json(toApiRecord(created.org) as OrganizationCreateResponse, { status: 201 })
  } catch (e) {
    console.error('[POST /api/organizations]', e)
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2002') {
      return NextResponse.json({ message: 'この条件では組織を作成できません' }, { status: 409 })
    }
    return NextResponse.json({ message: '組織の作成に失敗しました' }, { status: 500 })
  }
}
