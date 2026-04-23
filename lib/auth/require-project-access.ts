import { NextResponse } from 'next/server'
import { ProjectMemberRole, type OrganizationMemberRole, type User } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAppUserJson } from '@/lib/auth/require-app-user'
import type { CurrentSessionContext } from '@/lib/auth/get-current-session'

export type ProjectAccessContext = {
  /** セッション経由で解決済みの app ユーザー */
  appUser: User
  auth: CurrentSessionContext['auth']
  project: {
    id: string
    organizationId: string
    name: string
    description: string | null
    createdAt: Date
    updatedAt: Date
  }
  /** 当該 organization における所属（企業 / ワークスペース側ロール） */
  organizationMember: { id: string; role: OrganizationMemberRole }
  /** 当該 project における参加（プロジェクト側ロール） */
  projectMember: { id: string; role: ProjectMemberRole }
}

export type ProjectAccessResult =
  | { ok: true; ctx: ProjectAccessContext }
  | { ok: false; response: NextResponse }

const MSG_NO_ORG = 'このワークスペースにアクセスする権限がありません'
const MSG_NO_PROJECT = 'このプロジェクトに参加していません'
/** 設定・メンバー・列などの管理操作に使う */
const MSG_NO_MANAGE = 'この操作を行う権限がありません'
/** オーナー専用（OWNER ロールの付与・譲渡・降格、オーナー行の削除 等） — API からも利用可 */
export const MSG_PROJECT_OWNER_ONLY = 'この操作はオーナーのみ実行できます'

/**
 * `project_members` が OWNER か。責任者専用操作の判定用。
 * 「管理できる」（`isProjectManagerRole`）と区別する。
 */
export function isProjectOwnerRole(role: ProjectMemberRole): boolean {
  return role === ProjectMemberRole.OWNER
}

/**
 * あるメンバーの `role` を `next` へ変える操作が、**OWNER ロールの付与・剥奪に関わるか**（ADMIN には許可しない差分の核）。
 * 同じロール同士（変更なし）は `false`。
 */
export function isMemberRoleChangeTouchingOwner(
  existing: ProjectMemberRole,
  next: ProjectMemberRole
): boolean {
  if (existing === next) return false
  return existing === ProjectMemberRole.OWNER || next === ProjectMemberRole.OWNER
}

/**
 * `requireProjectAccessJson` に加え、**project ロールが OWNER のみ** 許可。
 * ADMIN → 403（`MSG_OWNER_ONLY`）
 */
export async function requireProjectOwnerJson(projectIdRaw: string | undefined | null): Promise<ProjectAccessResult> {
  const access = await requireProjectAccessJson(projectIdRaw)
  if (!access.ok) return access
  if (!isProjectOwnerRole(access.ctx.projectMember.role)) {
    return {
      ok: false,
      response: NextResponse.json({ message: MSG_PROJECT_OWNER_ONLY }, { status: 403 }),
    }
  }
  return access
}

/**
 * `project_members` が OWNER または ADMIN か。MEMBER だけのユーザーは `false`。
 * 「プロジェクトに参加している」と「プロジェクトを管理できる」を区別する。
 */
export function isProjectManagerRole(role: ProjectMemberRole): boolean {
  return role === ProjectMemberRole.ADMIN || role === ProjectMemberRole.OWNER
}

/**
 * 単一 project に対する API 用: ログイン済みかつ **organization 所属** かつ **project_members 参加**。
 * **MEMBER も通る**（閲覧・タスク等）。管理系は `requireProjectManagerJson` を使う。
 * - 未ログイン → 401（`requireAppUserJson`）
 * - project 不存在 → 404
 * - org 未所属 → 403
 * - project 未参加 → 403
 */
export async function requireProjectAccessJson(projectIdRaw: string | undefined | null): Promise<ProjectAccessResult> {
  const auth = await requireAppUserJson()
  if (!auth.ok) return auth

  const projectId = projectIdRaw?.trim()
  if (!projectId) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'projectId が不正です' }, { status: 400 }),
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      organizationId: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 }),
    }
  }

  const uid = auth.ctx.appUser.id

  const [organizationMember, projectMember] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { organizationId: project.organizationId, userId: uid },
      select: { id: true, role: true },
    }),
    prisma.projectMember.findFirst({
      where: { projectId, userId: uid },
      select: { id: true, role: true },
    }),
  ])

  if (!organizationMember) {
    return {
      ok: false,
      response: NextResponse.json({ message: MSG_NO_ORG }, { status: 403 }),
    }
  }
  if (!projectMember) {
    return {
      ok: false,
      response: NextResponse.json({ message: MSG_NO_PROJECT }, { status: 403 }),
    }
  }

  return {
    ok: true,
    ctx: {
      appUser: auth.ctx.appUser,
      auth: auth.ctx.auth,
      project,
      organizationMember,
      projectMember,
    },
  }
}

/**
 * タスク ID から project を解決し、同じく二層認可を適用する。
 */
export async function requireProjectAccessForTaskJson(taskIdRaw: string | undefined | null): Promise<ProjectAccessResult> {
  const taskId = taskIdRaw?.trim()
  if (!taskId) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'taskId が不正です' }, { status: 400 }),
    }
  }

  const task = await prisma.kanbanTask.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  })

  if (!task) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'タスクが見つかりません' }, { status: 404 }),
    }
  }

  return requireProjectAccessJson(task.projectId)
}

/**
 * `requireProjectAccessJson` に加え、**project ロールが ADMIN または OWNER** のときのみ許可（メンバー管理・列設定等）。
 * MEMBER → 403（`MSG_NO_MANAGE`）
 */
export async function requireProjectManagerJson(projectIdRaw: string | undefined | null): Promise<ProjectAccessResult> {
  const access = await requireProjectAccessJson(projectIdRaw)
  if (!access.ok) return access
  if (!isProjectManagerRole(access.ctx.projectMember.role)) {
    return {
      ok: false,
      response: NextResponse.json({ message: MSG_NO_MANAGE }, { status: 403 }),
    }
  }
  return access
}
