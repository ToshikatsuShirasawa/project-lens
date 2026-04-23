import { NextResponse } from 'next/server'
import { getCurrentSessionContext } from '@/lib/auth/get-current-session'
import { prisma } from '@/lib/prisma'
import {
  userHasAnyOrganizationMember,
  userIsOwnerInAnyOrganization,
} from '@/lib/organization/organization-membership-helpers'
import type { MeApiResponse } from '@/lib/types'

const UNauthenticated: MeApiResponse = {
  user: null,
  hasOrganization: false,
  needsOnboarding: false,
  canCreateOrganization: false,
}

/**
 * 現在の Supabase セッションに対応するアプリユーザーを返す（初回は `users` に upsert）。
 * organization 所属・新規 WORKSPACE 作成可否はオンボーディング導線用。
 */
export async function GET() {
  try {
    const ctx = await getCurrentSessionContext()
    if (!ctx) {
      return NextResponse.json(UNauthenticated)
    }

    const uid = ctx.appUser.id
    const [anyMember, isOwner] = await Promise.all([
      userHasAnyOrganizationMember(uid, prisma),
      userIsOwnerInAnyOrganization(uid, prisma),
    ])

    const hasOrganization = anyMember
    const needsOnboarding = !anyMember
    const canCreateOrganization = !isOwner

    return NextResponse.json({
      user: {
        id: ctx.appUser.id,
        email: ctx.appUser.email,
        name: ctx.appUser.name,
      },
      hasOrganization,
      needsOnboarding,
      canCreateOrganization,
    } satisfies MeApiResponse)
  } catch (e) {
    console.error('[GET /api/auth/me]', e)
    return NextResponse.json({ message: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
  }
}
