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
import { Trash2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ProjectMemberApiRecord,
  ProjectMemberRoleApi,
  UserApiRecord,
} from '@/lib/types'

const ADD_NONE = '__none__'

const ROLE_LABEL: Record<ProjectMemberRoleApi, string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  MEMBER: 'メンバー',
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

  const loadAll = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      const [mRes, uRes] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(projectId)}/members`),
        fetch('/api/users'),
      ])
      const mBody: unknown = await mRes.json().catch(() => null)
      const uBody: unknown = await uRes.json().catch(() => null)

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
      setListError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const addableUsers = useMemo(
    () => users.filter((u) => !members.some((m) => m.userId === u.id)),
    [users, members]
  )

  const busy = adding || roleSavingId !== null || deleteSavingId !== null

  const handleAdd = async () => {
    const uid = addUserId.trim()
    if (!uid || adding || busy) return
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
      await loadAll()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '追加に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  const handleRoleChange = async (
    memberId: string,
    role: ProjectMemberRoleApi,
    previousRole: ProjectMemberRoleApi
  ) => {
    if (role === previousRole || busy) return
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
      await loadAll()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'ロールの更新に失敗しました')
    } finally {
      setRoleSavingId(null)
    }
  }

  const handleDelete = async (memberId: string) => {
    if (busy) return
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
      await loadAll()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '削除に失敗しました')
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
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            メンバーを追加
          </h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">ユーザー</span>
              <Select
                value={addUserId || ADD_NONE}
                onValueChange={(v) => setAddUserId(v === ADD_NONE ? '' : v)}
                disabled={loading || busy || addableUsers.length === 0}
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
                disabled={loading || busy}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">{ROLE_LABEL.MEMBER}</SelectItem>
                  <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
                  <SelectItem value="OWNER">{ROLE_LABEL.OWNER}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!addUserId.trim() || loading || busy || addableUsers.length === 0}
              className="shrink-0"
            >
              {adding ? '追加中…' : '追加'}
            </Button>
          </div>
          {!loading && addableUsers.length === 0 && users.length > 0 && (
            <p className="text-xs text-muted-foreground">追加できるユーザーはいません（全員が既にメンバーです）。</p>
          )}
          {!loading && users.length === 0 && (
            <p className="text-xs text-muted-foreground">
              ユーザーが未登録です。Prisma Studio 等で <code className="rounded bg-muted px-1">users</code>{' '}
              にユーザーを追加してください。
            </p>
          )}
        </div>

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
                        <SelectItem value="OWNER">{ROLE_LABEL.OWNER}</SelectItem>
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
                        <span className="text-[10px]">…</span>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
