'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Plus, Pause, X, ChevronLeft, ChevronRight, CheckCircle2, Loader2, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectMemberApiRecord, TaskCandidate } from '@/lib/types'
import { summarizeCandidateReasons } from '@/lib/ai/candidate-reason-summary'
import { buildComparativeRecommendationReason, scoreTaskCandidate } from '@/lib/ai/task-candidate-score'
import { buildTaskCandidatePriorityReason } from '@/lib/ai/task-candidate-priority-reason'
import {
  buildAiTaskCandidateEventPayload,
  logAiTaskCandidateEvent,
} from '@/lib/ai/log-candidate-event'

export interface CandidateApprovalOverrides {
  title?: string
  suggestedDueDate?: string
  suggestedAssignee?: string
  suggestedAssigneeUserId?: string
}

interface TaskCandidateSidePanelProps {
  projectId: string
  candidates: TaskCandidate[]
  candidatesLoading?: boolean
  projectMembers: ProjectMemberApiRecord[]
  addedCandidateIds: ReadonlySet<string>
  backlogColumnName: string
  onAddToKanban: (candidate: TaskCandidate, overrides?: CandidateApprovalOverrides) => Promise<void>
  onHold: (id: string) => void
  onDismiss: (id: string) => void
}

const KANBAN_AI_PANEL_OPEN_STORAGE_KEY = 'projectlens:kanban-ai-panel-open'
const ASSIGNEE_NONE_VALUE = '__none__'

const sourceConfig = {
  slack: { label: 'Slack', class: 'bg-emerald-100 text-emerald-700' },
  report: { label: '作業報告', class: 'bg-blue-100 text-blue-700' },
  meeting: { label: '議事録', class: 'bg-purple-100 text-purple-700' },
  ai: { label: 'AI検出', class: 'bg-primary/10 text-primary' },
}

const priorityLabelConfig = {
  high: { label: '優先度 高', class: 'bg-rose-100 text-rose-700' },
  medium: { label: '優先度 中', class: 'bg-amber-100 text-amber-700' },
  review: { label: '優先度 低', class: 'bg-muted text-muted-foreground' },
} as const

/** "category: keyword" 形式の extractionReasons を表示用ラベルに変換する */
const EXTRACTION_KEYWORD_DISPLAY: Record<string, string> = {
  必要: '必要表現あり',
  要確認: '要確認マーク',
  要対応: '要対応マーク',
  TODO: 'TODOタグあり',
  未対応: '未対応あり',
  次回: '次回対応の記載',
  明日: '明日対応の記載',
  残っている: '残タスクあり',
  これから: '今後対応の記載',
  修正する: '修正タスクあり',
  確認する: '確認タスクあり',
  作成する: '作成タスクあり',
  準備する: '準備タスクあり',
  調整する: '調整タスクあり',
  回答待ち: '回答待ち',
  確認待ち: '確認待ち',
  返信待ち: '返信待ち',
  レビュー待ち: 'レビュー待ち',
  依頼済み: '依頼済みあり',
  先方確認中: '先方確認中',
  対応: '対応の記載',
  手配: '手配の記載',
  依頼: '依頼の記載',
  課題: '課題の記載',
  確認: '確認の記載',
  修正: '修正の記載',
  準備: '準備の記載',
  調整: '調整の記載',
}

function formatExtractionReason(reason: string): string {
  const colonIdx = reason.indexOf(': ')
  if (colonIdx === -1) return reason
  const keyword = reason.slice(colonIdx + 2)
  return EXTRACTION_KEYWORD_DISPLAY[keyword] ?? `${keyword}あり`
}

interface CandidateDraft {
  title: string
  dueDate: string
  assigneeUserId: string
}

function memberOptionLabel(m: ProjectMemberApiRecord): string {
  const n = m.name?.trim()
  if (n) return n
  return m.email.split('@')[0] ?? m.email
}

function resolveInitialAssigneeUserId(candidate: TaskCandidate, members: ProjectMemberApiRecord[]): string {
  const suggested = candidate.suggestedAssignee?.trim()
  if (!suggested) return ''
  const normalized = suggested.toLowerCase()
  const matched = members.find((member) => memberOptionLabel(member).trim().toLowerCase() === normalized)
  return matched?.userId ?? ''
}

function toDateInputValue(s: string | undefined): string {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

function scrollToBacklogColumn() {
  document.getElementById('kanban-col-backlog')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

export function TaskCandidateSidePanel({
  projectId,
  candidates,
  candidatesLoading = false,
  projectMembers,
  addedCandidateIds,
  backlogColumnName,
  onAddToKanban,
  onHold,
  onDismiss,
}: TaskCandidateSidePanelProps) {
  const pendingCount = candidates.filter((c) => !addedCandidateIds.has(c.id)).length
  const [open, setOpen] = useState(true)
  const [openStateLoaded, setOpenStateLoaded] = useState(false)
  const shownCandidateIdsRef = useRef<Set<string>>(new Set())
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CandidateDraft>>({})
  const topRecommendation = useMemo(() => buildComparativeRecommendationReason(candidates), [candidates])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KANBAN_AI_PANEL_OPEN_STORAGE_KEY)
      if (stored === 'true') {
        setOpen(true)
      } else if (stored === 'false') {
        setOpen(false)
      }
    } catch {
      // localStorage may be unavailable; keep default behavior.
    } finally {
      setOpenStateLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!openStateLoaded) return
    try {
      window.localStorage.setItem(KANBAN_AI_PANEL_OPEN_STORAGE_KEY, String(open))
    } catch {
      // Ignore persistence failures and keep panel usable.
    }
  }, [open, openStateLoaded])

  useEffect(() => {
    if (!open || !openStateLoaded || candidates.length === 0) return
    const topId = candidates[0]?.id
    for (const c of candidates) {
      if (shownCandidateIdsRef.current.has(c.id)) continue
      shownCandidateIdsRef.current.add(c.id)
      console.info('[ai-event] shown candidate', c.id, 'extractionStatus:', c.extractionStatus)
      logAiTaskCandidateEvent(
        buildAiTaskCandidateEventPayload(projectId, c, 'shown', {
          isTopCandidate: topId === c.id,
          recommendationReasonOverride: topId === c.id ? topRecommendation.recommendationReason : undefined,
          scoreDiffToNext: topId === c.id ? topRecommendation.scoreDiffToNext : undefined,
          isComparativeRecommendation: topId === c.id ? topRecommendation.isComparativeRecommendation : undefined,
        })
      )
    }
  }, [open, openStateLoaded, candidates, projectId, topRecommendation])

  useEffect(() => {
    const candidateIds = new Set(candidates.map((candidate) => candidate.id))
    if (editingId && !candidateIds.has(editingId)) {
      setEditingId(null)
    }
    setDrafts((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([candidateId]) => candidateIds.has(candidateId))
      ) as Record<string, CandidateDraft>
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [candidates, editingId])

  const ensureDraft = (candidate: TaskCandidate) => {
    setDrafts((prev) => {
      if (prev[candidate.id]) return prev
      return {
        ...prev,
        [candidate.id]: {
          title: candidate.displayTitle ?? candidate.title,
          dueDate: toDateInputValue(candidate.suggestedDueDate),
          assigneeUserId: resolveInitialAssigneeUserId(candidate, projectMembers),
        },
      }
    })
  }

  const getDraft = (candidate: TaskCandidate): CandidateDraft => {
    return (
      drafts[candidate.id] ?? {
        title: candidate.displayTitle ?? candidate.title,
        dueDate: toDateInputValue(candidate.suggestedDueDate),
        assigneeUserId: resolveInitialAssigneeUserId(candidate, projectMembers),
      }
    )
  }

  const updateDraft = (candidateId: string, patch: Partial<CandidateDraft>) => {
    setDrafts((prev) => {
      if (!prev[candidateId]) return prev
      return {
        ...prev,
        [candidateId]: {
          ...prev[candidateId],
          ...patch,
        },
      }
    })
  }

  const getApprovalOverrides = (candidate: TaskCandidate): CandidateApprovalOverrides | undefined => {
    const draft = drafts[candidate.id]
    if (!draft) return undefined

    const title = draft.title.trim()
    const dueDate = draft.dueDate.trim()
    const assigneeUserId = draft.assigneeUserId.trim()
    const selectedMember = assigneeUserId
      ? projectMembers.find((member) => member.userId === assigneeUserId)
      : undefined
    const assignee = selectedMember ? memberOptionLabel(selectedMember) : ''
    const baseTitle = (candidate.displayTitle ?? candidate.title).trim()
    const baseDueDate = toDateInputValue(candidate.suggestedDueDate)
    const baseAssignee = (candidate.suggestedAssignee ?? '').trim()
    const baseAssigneeUserId = resolveInitialAssigneeUserId(candidate, projectMembers)

    const overrides: CandidateApprovalOverrides = {}
    if (title && title !== baseTitle) overrides.title = title
    if (dueDate !== baseDueDate) overrides.suggestedDueDate = dueDate || undefined
    if (assignee !== baseAssignee) overrides.suggestedAssignee = assignee || undefined
    if (assigneeUserId !== baseAssigneeUserId) overrides.suggestedAssigneeUserId = assigneeUserId || undefined

    return Object.keys(overrides).length > 0 ? overrides : undefined
  }

  if (!open) {
    return (
      <aside
        className="w-11 shrink-0 flex flex-col border-l border-border bg-background h-full"
        aria-label="AIタスク候補パネル（閉じています）"
      >
        <div className="flex flex-1 flex-col items-center gap-2 border-b border-border/80 py-2 bg-background">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-primary"
            onClick={() => setOpen(true)}
            title="AIタスク候補を開く"
            aria-expanded={false}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">AIタスク候補を開く</span>
          </Button>
          <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden />
          {pendingCount > 0 ? (
            <Badge className="text-[10px] h-5 min-w-5 px-1 justify-center bg-primary/10 text-primary border-0">
              {pendingCount}
            </Badge>
          ) : null}
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="w-80 shrink-0 flex flex-col border-l border-border bg-background h-full"
      aria-label="AIタスク候補"
    >
      <div className="flex items-center gap-2 border-b border-border/80 px-3 py-2.5 pr-2 bg-background">
        <span className="h-4 w-0.5 rounded-full bg-primary/40" aria-hidden />
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">AI提案タスク</span>
        {pendingCount > 0 && (
          <Badge className="shrink-0 text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0">
            {pendingCount}件
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(false)}
          title="候補パネルを閉じる"
          aria-expanded={true}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">候補パネルを閉じる</span>
        </Button>
      </div>
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border/80 bg-background">
        AIが抽出した候補です。承認するとカンバンのバックログに追加されます。
      </p>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            {candidatesLoading ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin text-primary/40" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">AI候補を確認しています...</p>
                  <p className="text-xs text-muted-foreground/60">作業報告から候補を抽出しています</p>
                </div>
              </>
            ) : (
              <>
                <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">候補はありません</p>
              </>
            )}
          </div>
        ) : (
          candidates.map((c, index) => {
            const src = sourceConfig[c.source]
            const isTopCandidate = index === 0
            const isSubmitting = submittingId === c.id
            const reasonSummary = summarizeCandidateReasons(c, { isTopCandidate: false, maxChips: 4 })
            const scoreResult = scoreTaskCandidate(c)
            const priorityReason = buildTaskCandidatePriorityReason(c, scoreResult)
            const priority = priorityLabelConfig[scoreResult.confidenceLevel]
            const isAdded = addedCandidateIds.has(c.id)
            const isWaiting = c.extractionStatus === 'waiting'
            const visibleReasons = (c.extractionReasons ?? []).slice(0, 2)
            const overflowCount = Math.max(0, (c.extractionReasons?.length ?? 0) - 2)
            return (
              <Card
                key={c.id}
                className={cn(
                  'bg-card border-border/70 transition-colors hover:bg-muted/40',
                  isTopCandidate && 'border-border'
                )}
              >
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{c.displayTitle ?? c.title}</p>
                      <p className="mt-0.5 truncate whitespace-nowrap text-[11px] text-muted-foreground">
                        優先理由: {priorityReason}
                      </p>
                      {(c.mergedCount ?? 1) > 1 && (
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          （関連{c.mergedCount}件）
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end items-center gap-1">
                      {isTopCandidate && (
                        <Badge className="text-[10px] h-4 px-1.5 border-0 bg-primary text-primary-foreground">
                          おすすめ
                        </Badge>
                      )}
                      <Badge className={cn('text-[10px] h-4 px-1.5 border-0', src.class)}>{src.label}</Badge>
                      <Badge className={cn('text-[10px] h-4 px-1.5 border-0', priority.class)}>
                        {priority.label}
                      </Badge>
                    </div>
                  </div>
                  {isWaiting && (
                    <Badge className="text-[10px] h-5 px-2 border-0 bg-sky-100 text-sky-700">
                      回答待ち候補
                    </Badge>
                  )}
                  <div className="space-y-1.5">
                    {isTopCandidate && topRecommendation.recommendationReason ? (
                      <p className="text-[11px] font-medium text-primary">{topRecommendation.recommendationReason}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-1">
                      {reasonSummary.chips.map((chip, chipIndex) => (
                        <Badge
                          key={`${c.id}-${chip.label}`}
                          className={cn(
                            'h-5 border-0 px-2 text-[10px]',
                            chipIndex === 0 || chip.strength === 'strong'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {chip.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {visibleReasons.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                        理由
                      </p>
                      <ul className="space-y-0.5">
                        {visibleReasons.map((r) => (
                          <li key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
                            {formatExtractionReason(r)}
                          </li>
                        ))}
                        {overflowCount > 0 && (
                          <li className="text-xs text-muted-foreground/70 pl-2.5">
                            ほか{overflowCount}件
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                      補足
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {reasonSummary.supportText}
                    </p>
                  </div>
                  {(c.suggestedAssignee || c.suggestedDueDate) && (
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      {c.suggestedAssignee && <span>担当候補: {c.suggestedAssignee}</span>}
                      {c.suggestedDueDate && <span>期限候補: {c.suggestedDueDate}</span>}
                    </div>
                  )}
                  {!isAdded && editingId !== c.id && (
                    <div className="flex justify-start">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] text-muted-foreground"
                        onClick={() => {
                          ensureDraft(c)
                          setEditingId(c.id)
                        }}
                      >
                        <PencilLine className="h-3 w-3" />
                        編集
                      </Button>
                    </div>
                  )}
                  {!isAdded && editingId === c.id && (
                    <div className="relative space-y-2 rounded-md border border-border/80 bg-muted/40 p-2.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-1.5 top-1.5 h-6 w-6 text-muted-foreground"
                        onClick={() => setEditingId(null)}
                        title="編集を閉じる"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span className="sr-only">編集を閉じる</span>
                      </Button>
                      <p className="text-[11px] text-muted-foreground">編集してから追加できます</p>
                      <div className="space-y-1">
                        <Label htmlFor={`candidate-title-${c.id}`} className="text-[11px]">
                          タイトル
                        </Label>
                        <Input
                          id={`candidate-title-${c.id}`}
                          value={getDraft(c).title}
                          onChange={(e) => updateDraft(c.id, { title: e.target.value })}
                          placeholder="タスクタイトル"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`candidate-due-${c.id}`} className="text-[11px]">
                            期限
                          </Label>
                          <Input
                            id={`candidate-due-${c.id}`}
                            type="date"
                            value={getDraft(c).dueDate}
                            onChange={(e) => updateDraft(c.id, { dueDate: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`candidate-assignee-${c.id}`} className="text-[11px]">
                            担当
                          </Label>
                          <Select
                            value={getDraft(c).assigneeUserId.trim() ? getDraft(c).assigneeUserId : ASSIGNEE_NONE_VALUE}
                            onValueChange={(value) =>
                              updateDraft(c.id, { assigneeUserId: value === ASSIGNEE_NONE_VALUE ? '' : value })
                            }
                          >
                            <SelectTrigger id={`candidate-assignee-${c.id}`} className="h-8 text-xs">
                              <SelectValue placeholder="未設定" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ASSIGNEE_NONE_VALUE}>未設定</SelectItem>
                              {projectMembers.map((member) => (
                                <SelectItem key={member.userId} value={member.userId}>
                                  {memberOptionLabel(member)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                  {isAdded ? (
                    <div className="flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 border border-emerald-200/60">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {backlogColumnName} に追加済み
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] text-emerald-700 hover:bg-emerald-100"
                        onClick={scrollToBacklogColumn}
                      >
                        タスクを見る
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-muted-foreground">
                        → {backlogColumnName} に追加されます
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className={cn(
                            'flex-1 gap-1 text-xs h-7 transition-all active:scale-[0.99]',
                            'hover:shadow-sm hover:translate-y-[-1px]'
                          )}
                          onClick={() => {
                            if (isAdded) return
                            setSubmittingId(c.id)
                            void onAddToKanban(c, getApprovalOverrides(c)).finally(() =>
                              setSubmittingId(null)
                            )
                          }}
                          disabled={isSubmitting || isAdded}
                        >
                          {isSubmitting ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              追加中...
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />+ 追加
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7 px-2"
                          onClick={() => onHold(c.id)}
                          title="あとで"
                        >
                          <Pause className="h-3 w-3" />
                          あとで
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs h-7 px-2 text-muted-foreground"
                          onClick={() => onDismiss(c.id)}
                          title="却下"
                        >
                          <X className="h-3 w-3" />
                          却下
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </aside>
  )
}
