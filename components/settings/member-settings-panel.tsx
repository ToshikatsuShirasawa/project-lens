'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Loader2, Mail, Trash2, UserPlus } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/operation-toast'
import { cn } from '@/lib/utils'
import {
  isProjectManagerRoleApi,
  isProjectOwnerRoleApi,
  type ProjectMemberApiRecord,
  type ProjectMemberRoleApi,
  type ProjectApiRecord,
  type UserApiRecord,
  type ProjectInvitationApiRecord,
  type ProjectInvitationStatusApi,
} from '@/lib/types'

const ADD_NONE = '__none__'

const ROLE_LABEL: Record<ProjectMemberRoleApi, string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  MEMBER: 'メンバー',
}

const INVITE_STATUS_LABEL: Record<ProjectInvitationStatusApi, string> = {
  PENDING: '未対応',
  ACCEPTED: '受諾済',
  REVOKED: '取り消し',
  EXPIRED: '期限切れ',
}

function displayName(m: Pick<ProjectMemberApiRecord, 'name' | 'email'>): string {
  const n = m.name?.trim()
  if (n) return n
  return m.email.split('@')[0] ?? m.email
}

function initials(m: Pick<ProjectMemberApiRecord, 'name' | 'email'>): string {
  const base = displayName(m)
  return base.slice(0, 2)
}

interface MemberSettingsPanelProps {
  projectId: string
}

export function MemberSettingsPanel({ projectId }: MemberSettingsPanelProps) {
  const [members, setMembers] = useState<ProjectMemberApiRecord[]>([])
  const [users, setUsers] = useState<UserApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<ProjectMemberRoleApi>('MEMBER')
  const [adding, setAdding] = useState(false)

  const [roleSavingId, setRoleSavingId] = useState<string | null>(null)
  const [deleteSavingId, setDeleteSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ProjectMemberRoleApi>('MEMBER')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [invitations, setInvitations] = useState<ProjectInvitationApiRecord[]>([])
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  /** 現在ユーザーが `project_members.role === OWNER` か（オーナー専用のメンバー操作） */
  const [myProjectRole, setMyProjectRole] = useState<ProjectMemberRoleApi | null>(null)

  const loadAll = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      const [mRes, uRes, pRes, iRes] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(projectId)}/members`),
        fetch(`/api/projects/${encodeURIComponent(projectId)}/member-candidates`),
        fetch(`/api/projects/${encodeURIComponent(projectId)}`),
        fetch(`/api/projects/${encodeURIComponent(projectId)}/invitations`),
      ])
      const mBody: unknown = await mRes.json().catch(() => null)
      const uBody: unknown = await uRes.json().catch(() => null)
      const pBody: unknown = await pRes.json().catch(() => null)

      if (pRes.ok && pBody && typeof pBody === 'object' && pBody) {
        const pr = pBody as ProjectApiRecord
        const role = pr.myProjectRole ?? null
        setMyProjectRole(role)
        setCanManage(isProjectManagerRoleApi(role))
      } else {
        setMyProjectRole(null)
        setCanManage(false)
      }

      if (iRes.ok) {
        const iParsed = (await iRes.json().catch(() => null)) as { invitations?: ProjectInvitationApiRecord[] } | null
        setInvitations(Array.isArray(iParsed?.invitations) ? iParsed.invitations : [])
      } else {
        setInvitations([])
      }

      if (!mRes.ok) {
        const msg =
          mBody &&
          typeof mBody === 'object' &&
          'message' in mBody &&
          typeof (mBody as { message: unknown }).message === 'string'
            ? (mBody as { message: string }).message
            : `メンバー一覧を取得できませんでした（HTTP ${mRes.status}）`
        throw new Error(msg)
      }

      const mParsed = mBody && typeof mBody === 'object' ? mBody : null
      const mList =
        mParsed && 'members' in mParsed && Array.isArray((mParsed as { members: unknown }).members)
          ? (mParsed as { members: ProjectMemberApiRecord[] }).members
          : []

      setMembers(mList)

      if (uRes.ok) {
        const uParsed = uBody && typeof uBody === 'object' ? uBody : null
        const uList =
          uParsed && 'users' in uParsed && Array.isArray((uParsed as { users: unknown }).users)
            ? (uParsed as { users: UserApiRecord[] }).users
            : []
        setUsers(uList)
      } else {
        setUsers([])
      }
    } catch (e) {
      setMembers([])
      setUsers([])
      setInvitations([])
      setListError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  /** API が「同じ workspace かつ未参加」に絞った候補。念のため一覧と重複しないよう重ね合わせ */
  const addableUsers = useMemo(
    () => users.filter((u) => !members.some((m) => m.userId === u.id)),
    [users, members]
  )

  const busy =
    adding ||
    roleSavingId !== null ||
    deleteSavingId !== null ||
    inviteBusy ||
    revokingId !== null
  const managementLocked = !canManage
  const isCurrentUserProjectOwner = isProjectOwnerRoleApi(myProjectRole)

  useEffect(() => {
    if (canManage && !isCurrentUserProjectOwner && addRole === 'OWNER') {
      setAddRole('MEMBER')
    }
  }, [canManage, isCurrentUserProjectOwner, addRole])

  const handleAdd = async () => {
    const uid = addUserId.trim()
    if (!uid || adding || busy || managementLocked) return
    setActionError(null)
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, role: addRole }),
      })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        throw new Error(msg)
      }
      setAddUserId('')
      setAddRole('MEMBER')
      toastSuccess('メンバーを追加しました')
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '追加に失敗しました'
      console.error('[members] add', e)
      setActionError(msg)
      toastError(msg)
    } finally {
      setAdding(false)
    }
  }

  const handleInviteCreate = async () => {
    const em = inviteEmail.trim()
    if (!em || inviteBusy || managementLocked) return
    setActionError(null)
    setInviteBusy(true)
    setLastInviteUrl(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, role: inviteRole }),
      })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        throw new Error(msg)
      }
      if (
        body &&
        typeof body === 'object' &&
        'invitationUrl' in body &&
        typeof (body as { invitationUrl: unknown }).invitationUrl === 'string'
      ) {
        setLastInviteUrl((body as { invitationUrl: string }).invitationUrl)
      }
      setInviteEmail('')
      setInviteRole('MEMBER')
      toastSuccess('招待リンクを作成しました')
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '招待の作成に失敗しました'
      console.error('[invitations] create', e)
      setActionError(msg)
      toastError(msg)
    } finally {
      setInviteBusy(false)
    }
  }

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toastSuccess('リンクをコピーしました')
    } catch (e) {
      console.error('[invitations] copy', e)
      toastError('コピーに失敗しました')
    }
  }

  const handleRevokeInvitation = async (invId: string) => {
    if (busy || managementLocked) return
    setActionError(null)
    setRevokingId(invId)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/invitations/${encodeURIComponent(invId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'REVOKED' }),
        }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        throw new Error(msg)
      }
      toastSuccess('招待を取り消しました')
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '取り消しに失敗しました'
      console.error('[invitations] revoke', e)
      setActionError(msg)
      toastError(msg)
    } finally {
      setRevokingId(null)
    }
  }

  const handleRoleChange = async (
    memberId: string,
    role: ProjectMemberRoleApi,
    previousRole: ProjectMemberRoleApi
  ) => {
    if (role === previousRole || busy || managementLocked) return
    setActionError(null)
    setRoleSavingId(memberId)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        throw new Error(msg)
      }
      toastSuccess('ロールを更新しました')
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ロールの更新に失敗しました'
      console.error('[members] role', e)
      setActionError(msg)
      toastError(msg)
    } finally {
      setRoleSavingId(null)
    }
  }

  const handleDelete = async (memberId: string) => {
    if (busy || managementLocked) return
    setActionError(null)
    setDeleteSavingId(memberId)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
        { method: 'DELETE' }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `HTTP ${res.status}`
        throw new Error(msg)
      }
      toastSuccess('メンバーを削除しました')
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '削除に失敗しました'
      console.error('[members] delete', e)
      setActionError(msg)
      toastError(msg)
    } finally {
      setDeleteSavingId(null)
    }
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>メンバー管理</CardTitle>
        <CardDescription>
          プロジェクトメンバーの一覧・追加・ロール変更・削除ができます。カンバンの担当者候補はこの一覧に連動します。
          オーナー役の付与・解除やオーナー行の削除は、プロジェクトのオーナーのみが行えます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {managementLocked ? (
          <p className="text-sm text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
            メンバーの追加・ロール変更・削除は、プロジェクトの<strong className="text-foreground">管理者</strong>または
            <strong className="text-foreground">オーナー</strong>のみが行えます。一覧の閲覧は可能です。
          </p>
        ) : null}
        {canManage && !isCurrentUserProjectOwner ? (
          <p className="text-sm text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
            管理者として、オーナー役の付与・変更・オーナー行の削除は行えません（オーナーのみ）。その他のメンバー管理は行えます。
          </p>
        ) : null}
        {!loading ? (
          <p className="text-sm text-foreground/90 border-l-2 border-primary/50 pl-3 py-0.5">
            すでにワークスペースに参加しているユーザーは上から、まだ参加していない相手は下の「メールで招待」をご利用ください。
          </p>
        ) : null}
        <div
          className={cn(
            'rounded-lg border border-border bg-muted/20 p-4 space-y-3',
            managementLocked && 'opacity-60 pointer-events-none'
          )}
        >
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            メンバーを追加
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            同じワークスペースに参加しているユーザーを、このプロジェクトのメンバーとして追加できます。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">ユーザー</span>
              <Select
                value={addUserId || ADD_NONE}
                onValueChange={(v) => setAddUserId(v === ADD_NONE ? '' : v)}
                disabled={loading || busy || addableUsers.length === 0 || managementLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? '読み込み中…' : 'ユーザーを選択'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ADD_NONE}>選択してください</SelectItem>
                  {addableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {displayName(u)} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-40">
              <span className="text-xs text-muted-foreground">ロール</span>
              <Select
                value={addRole}
                onValueChange={(v) => setAddRole(v as ProjectMemberRoleApi)}
                disabled={loading || busy || managementLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                {/* オーナー役の付与は POST /members でも OWNER のみ — 非オーナーには選択肢を出さない */}
                <SelectContent>
                  <SelectItem value="MEMBER">{ROLE_LABEL.MEMBER}</SelectItem>
                  <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
                  {isCurrentUserProjectOwner ? (
                    <SelectItem value="OWNER">{ROLE_LABEL.OWNER}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!addUserId.trim() || loading || busy || addableUsers.length === 0 || managementLocked}
              className="shrink-0"
            >
              {adding ? '追加中…' : '追加'}
            </Button>
          </div>
          {!loading && addableUsers.length === 0 && users.length > 0 && (
            <p className="text-xs text-muted-foreground">追加できるユーザーはいません（全員が既にこのプロジェクトのメンバーです）。</p>
          )}
          {!loading && users.length === 0 && (
            <p className="text-xs text-muted-foreground">
              このワークスペースに、まだ追加できる他のユーザーがいません（他メンバーが未参加、または全員がこのプロジェクトに参加済みです）。新しく参加してもらう場合はメール招待を使ってください。
            </p>
          )}
        </div>

        <div
          className={cn(
            'rounded-lg border border-border bg-muted/20 p-4 space-y-3',
            managementLocked && 'opacity-60 pointer-events-none'
          )}
        >
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            メールで招待
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            まだこのワークスペースに参加していない相手のメール宛に、参加用の招待リンクを発行します（メールの自動送信は行いません）。相手に URL を渡してください。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 flex-1 min-w-0">
              <Label htmlFor="member-invite-email" className="text-xs text-muted-foreground">
                メール
              </Label>
              <Input
                id="member-invite-email"
                type="email"
                autoComplete="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={loading || busy || managementLocked}
              />
            </div>
            <div className="space-y-2 w-full sm:w-40">
              <span className="text-xs text-muted-foreground">ロール</span>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as ProjectMemberRoleApi)}
                disabled={loading || busy || managementLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">{ROLE_LABEL.MEMBER}</SelectItem>
                  <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
                  {isCurrentUserProjectOwner ? (
                    <SelectItem value="OWNER">{ROLE_LABEL.OWNER}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void handleInviteCreate()}
              disabled={!inviteEmail.trim() || loading || busy || managementLocked}
              className="shrink-0"
            >
              {inviteBusy ? '作成中…' : '招待リンクを作成'}
            </Button>
          </div>
          {lastInviteUrl ? (
            <div className="rounded border border-dashed border-border p-3 space-y-2 bg-background/50">
              <p className="text-sm text-foreground">
                このリンクを共有すると、相手はログイン後にこのプロジェクトへ参加できます。
              </p>
              <p className="text-xs text-muted-foreground">URL をコピーして、チャットやメールで相手に送ってください。</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <code
                  className="text-xs break-all text-foreground flex-1 bg-muted/50 border border-border px-2 py-2 rounded-md select-all cursor-text"
                  tabIndex={0}
                >
                  {lastInviteUrl}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="shrink-0 sm:self-center"
                  onClick={() => void copyInviteUrl(lastInviteUrl)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  コピー
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {canManage && invitations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">招待一覧</h3>
            <ul className="space-y-2">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-background/50 p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-all text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABEL[inv.role]} ・ {INVITE_STATUS_LABEL[inv.status]} ・ 期限:{' '}
                      {new Date(inv.expiresAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  {inv.status === 'PENDING' && canManage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || revokingId === inv.id}
                      onClick={() => void handleRevokeInvitation(inv.id)}
                    >
                      {revokingId === inv.id ? '取り消し中…' : '取り消す'}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        ) : listError ? (
          <p className="text-sm text-destructive" role="alert">
            {listError}
          </p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">メンバーがまだいません。上のフォームから追加できます。</p>
        ) : (
          <ul className="space-y-3">
            {members.map((member) => {
              const savingThis = roleSavingId === member.id || deleteSavingId === member.id
              const rowIsOwner = member.role === 'OWNER'
              const ownerRowLockedForAdmin = canManage && !isCurrentUserProjectOwner && rowIsOwner
              return (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-3 sm:flex-row sm:items-center"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs">{initials(member)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground truncate">{displayName(member)}</span>
                      <Badge variant="secondary" className={cn(member.role === 'OWNER' && 'bg-primary/15 text-primary')}>
                        {ROLE_LABEL[member.role]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {canManage ? (
                      ownerRowLockedForAdmin ? (
                        <span className="text-xs text-muted-foreground">ロール・削除はオーナーのみ</span>
                      ) : (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(v) =>
                              void handleRoleChange(member.id, v as ProjectMemberRoleApi, member.role)
                            }
                            disabled={busy}
                          >
                            <SelectTrigger className="w-[9.5rem]" aria-label="ロールを変更">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {isCurrentUserProjectOwner ? (
                                <SelectItem value="OWNER">{ROLE_LABEL.OWNER}</SelectItem>
                              ) : null}
                              <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
                              <SelectItem value="MEMBER">{ROLE_LABEL.MEMBER}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={busy}
                            aria-label="メンバーを削除"
                            onClick={() => void handleDelete(member.id)}
                          >
                            {deleteSavingId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-label="削除中" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )
                    ) : null}
                  </div>
                  {savingThis && roleSavingId === member.id && (
                    <span className="text-xs text-muted-foreground sm:w-full sm:order-last">更新中…</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {actionError && (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
