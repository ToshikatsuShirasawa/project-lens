'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  TrendingUp,
  ListPlus,
  Plus,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  splitReportIntoClauses,
  judgeExtractionClause,
} from '@/lib/ai/clause-extraction-judge'
import type { WorkReportPreview } from '@/lib/types'

interface ReportFormData {
  completed: string
  inProgress: string
  blockers: string
  nextActions: string
}

interface WorkReportFormProps {
  projectId: string
}

// blockers 全体が「問題なし」系のみの場合にマッチ
const NOTHING_RE = /^(なし|特になし|ありません|問題なし|問題ありません|問題なかった|順調|異常なし|支障なし|特に問題ない|特に問題はない)[。！？!?\s]*$/

// 明示的なリスク表現
const RISK_KEYWORDS = [
  'スケジュールに影響',
  '期限に間に合わない',
  '間に合わない',
  '仕様が未確定',
  '作業が停滞',
  '停滞してい',
  '遅延',
  '影響する可能性',
  '遅れが生じ',
]

// 不足情報・未定の表現
const MISSING_KEYWORDS = [
  '未定',
  '不明',
  '未確定',
  '分から',
  '決まっていない',
  '不足している',
  '分かっていない',
]

function trimLine(s: string, max = 32): string {
  const c = s.replace(/\s+/g, ' ').trim()
  return c.length > max ? `${c.slice(0, max - 1)}…` : c
}

function generatePreview(report: ReportFormData): WorkReportPreview {
  const { completed, inProgress, blockers, nextActions } = report

  // ── 状況整理: completed + inProgress の各節を表示 ──
  const statusItems: string[] = []
  for (const field of [completed, inProgress]) {
    if (!field.trim()) continue
    for (const clause of splitReportIntoClauses(field)) {
      if (clause.length >= 2 && !judgeExtractionClause(clause).shouldExtract) {
        statusItems.push(trimLine(clause))
      }
    }
  }

  // ── 課題: blockers から抽出（問題なし系・done/in-progress は除外または状況整理へ）──
  const issueItems: string[] = []
  if (blockers.trim() && !NOTHING_RE.test(blockers.trim())) {
    for (const clause of splitReportIntoClauses(blockers)) {
      const j = judgeExtractionClause(clause)
      if (j.status === 'memo') continue
      if (j.status === 'done') {
        // in-progress / 完了報告は課題ではなく状況整理へ
        statusItems.push(trimLine(clause))
        continue
      }
      issueItems.push(trimLine(clause))
    }
  }

  // ── リスク: 全フィールドから明示的なリスク表現のみ ──
  const riskItems: string[] = []
  const allClauses = splitReportIntoClauses(
    [completed, inProgress, blockers, nextActions].join('\n'),
  )
  for (const clause of allClauses) {
    if (RISK_KEYWORDS.some((k) => clause.includes(k))) {
      riskItems.push(trimLine(clause))
    }
  }

  // ── 次にやること: nextActions から done/memo を除いた節 ──
  const todoItems: string[] = []
  if (nextActions.trim()) {
    for (const clause of splitReportIntoClauses(nextActions)) {
      const j = judgeExtractionClause(clause)
      if (j.status === 'done' || j.status === 'memo') continue
      todoItems.push(trimLine(clause))
    }
  }

  // ── 不足情報: 明示的な未定・不明表現のみ ──
  const missingItems: string[] = []
  for (const clause of allClauses) {
    if (MISSING_KEYWORDS.some((k) => clause.includes(k))) {
      missingItems.push(trimLine(clause))
    }
  }

  // ── タスク候補: 全フィールドから shouldExtract=true の節 ──
  const taskCandidates: string[] = []
  const seenKeys = new Set<string>()
  for (const field of [completed, inProgress, blockers, nextActions]) {
    if (!field.trim()) continue
    for (const clause of splitReportIntoClauses(field)) {
      const j = judgeExtractionClause(clause)
      if (!j.shouldExtract) continue
      const title = trimLine(clause, 28)
      const key = title.toLowerCase()
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        taskCandidates.push(title)
      }
    }
  }

  return { status: statusItems, issues: issueItems, risks: riskItems, todos: todoItems, missingInfo: missingItems, taskCandidates }
}

type CandidateAddState = 'idle' | 'adding' | 'added' | 'error'

export function WorkReportForm({ projectId }: WorkReportFormProps) {
  const { toast } = useToast()
  const [report, setReport] = useState<ReportFormData>({
    completed: '',
    inProgress: '',
    blockers: '',
    nextActions: '',
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<WorkReportPreview | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [candidateStates, setCandidateStates] = useState<Record<string, CandidateAddState>>({})

  const hasContent = Object.values(report).some((v) => v.trim().length > 0)

  useEffect(() => {
    const totalLength = Object.values(report).join('').length
    if (totalLength <= 5) {
      setAnalysis(null)
      setIsAnalyzing(false)
      return
    }
    setIsAnalyzing(true)
    const timer = setTimeout(() => {
      setAnalysis(generatePreview(report))
      setIsAnalyzing(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [report])

  const handleAddCandidate = async (title: string) => {
    const state = candidateStates[title]
    if (state === 'adding' || state === 'added') return
    setCandidateStates((prev) => ({ ...prev, [title]: 'adding' }))
    try {
      const res = await fetch('/api/kanban-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          description: `作業報告からAI候補として抽出されました。\n元の候補：${title}`,
          columnKey: 'backlog',
        }),
      })
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null)
        const message =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: unknown }).message)
            : 'タスクの追加に失敗しました'
        toast({ title: 'エラー', description: message, variant: 'destructive' })
        setCandidateStates((prev) => ({ ...prev, [title]: 'error' }))
        return
      }
      setCandidateStates((prev) => ({ ...prev, [title]: 'added' }))
      window.dispatchEvent(new CustomEvent('projectlens:kanban-updated', { detail: { projectId } }))
    } catch {
      toast({ title: 'エラー', description: 'ネットワークエラーが発生しました', variant: 'destructive' })
      setCandidateStates((prev) => ({ ...prev, [title]: 'error' }))
    }
  }

  const handleSubmit = async () => {
    if (!hasContent || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null)
        const message =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: unknown }).message)
            : '保存に失敗しました'
        toast({ title: 'エラー', description: message, variant: 'destructive' })
        return
      }
      setReport({ completed: '', inProgress: '', blockers: '', nextActions: '' })
      setAnalysis(null)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
      toast({ title: '送信しました', description: '作業報告を保存しました' })
      window.dispatchEvent(new CustomEvent('projectlens:reports-updated', { detail: { projectId } }))
    } catch {
      toast({ title: 'エラー', description: 'ネットワークエラーが発生しました', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showStatus = report.completed.trim() || report.inProgress.trim()
  const showIssues = analysis !== null && issuesShouldShow(report, analysis)
  const showRisks = analysis !== null && analysis.risks.length > 0
  const showTodos = report.nextActions.trim()
  const showMissing = analysis !== null && analysis.missingInfo.length > 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Report Form */}
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">今日の作業報告</CardTitle>
          <p className="text-sm text-muted-foreground">1〜2分で記録できる軽量な日報です</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">今日やったこと</label>
            <Textarea
              value={report.completed}
              onChange={(e) => setReport({ ...report, completed: e.target.value })}
              placeholder="例: 商品詳細ページのレスポンシブ対応を完了しました。画像ギャラリーのスワイプ機能も追加。"
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">現在取り組んでいること</label>
            <Textarea
              value={report.inProgress}
              onChange={(e) => setReport({ ...report, inProgress: e.target.value })}
              placeholder="例: カート機能のセッション管理を実装中。明日の午前中には完了予定。"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">困っていること・ブロッカー</label>
            <Textarea
              value={report.blockers}
              onChange={(e) => setReport({ ...report, blockers: e.target.value })}
              placeholder="例: 決済APIの仕様書がまだ届いていないため、連携部分の実装が進められません。"
              rows={2}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">なければ空欄でOKです</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">次にやること</label>
            <Textarea
              value={report.nextActions}
              onChange={(e) => setReport({ ...report, nextActions: e.target.value })}
              placeholder="例: 明日は決済APIの代替案としてStripeの調査を進めます。"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!hasContent || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : submitted ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitted ? '送信しました！' : '報告を送信'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Preview */}
      <Card className="bg-card border-primary/20">
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">AI分析プレビュー</CardTitle>
            <p className="text-sm text-muted-foreground">入力内容をリアルタイムで整理します</p>
          </div>
          {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </CardHeader>
        <CardContent>
          {!hasContent || analysis === null ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Sparkles className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">入力すると分析結果が表示されます</p>
              <p className="text-xs text-muted-foreground/60 max-w-[220px] leading-relaxed">
                状況整理・課題・次にやること・タスク候補などをリアルタイムで抽出します
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {showStatus && (
                <AnalysisSection
                  icon={<TrendingUp className="h-3 w-3" />}
                  label="状況整理"
                  labelClass="bg-success/20 text-success"
                  items={analysis.status}
                  emptyText="内容から状況を読み取れませんでした"
                  itemClass="text-success"
                  ItemIcon={<CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />}
                />
              )}
              {showIssues && (
                <AnalysisSection
                  icon={<AlertTriangle className="h-3 w-3" />}
                  label="課題"
                  labelClass="bg-warning/20 text-warning"
                  items={analysis.issues}
                  emptyText=""
                  borderColor="border-warning/50"
                />
              )}
              {showRisks && (
                <AnalysisSection
                  icon={<AlertTriangle className="h-3 w-3" />}
                  label="リスク"
                  labelClass="bg-destructive/20 text-destructive"
                  items={analysis.risks}
                  emptyText=""
                  borderColor="border-destructive/50"
                />
              )}
              {showTodos && (
                <AnalysisSection
                  icon={<ArrowRight className="h-3 w-3" />}
                  label="次にやること"
                  labelClass="bg-primary/20 text-primary"
                  items={analysis.todos}
                  emptyText="内容から次のアクションを読み取れませんでした"
                  borderColor="border-primary/50"
                />
              )}
              {showMissing && (
                <AnalysisSection
                  icon={<HelpCircle className="h-3 w-3" />}
                  label="不足情報"
                  labelClass=""
                  items={analysis.missingInfo}
                  emptyText=""
                  borderColor="border-muted-foreground/30"
                />
              )}
              {analysis.taskCandidates.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Badge className="gap-1 bg-primary/20 text-primary border-0">
                      <ListPlus className="h-3 w-3" />
                      タスク候補
                    </Badge>
                    <span className="text-xs text-muted-foreground">タスクとして追加できます</span>
                  </div>
                  <ul className="space-y-2">
                    {analysis.taskCandidates.map((item, i) => {
                      const cs = candidateStates[item] ?? 'idle'
                      return (
                        <li
                          key={i}
                          className="flex items-center justify-between text-sm text-foreground rounded-md bg-primary/5 px-3 py-2"
                        >
                          <span>{item}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 gap-1 text-xs text-primary hover:text-primary shrink-0"
                            onClick={() => handleAddCandidate(item)}
                            disabled={cs === 'adding' || cs === 'added'}
                          >
                            {cs === 'adding' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : cs === 'added' ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            {cs === 'adding' ? '追加中...' : cs === 'added' ? '追加済み' : cs === 'error' ? '再試行' : '追加'}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {!showStatus && !showIssues && !showRisks && !showTodos && !showMissing && analysis.taskCandidates.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  入力内容から分析できる内容がありませんでした
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────

function issuesShouldShow(report: ReportFormData, analysis: WorkReportPreview): boolean {
  if (!report.blockers.trim()) return false
  if (NOTHING_RE.test(report.blockers.trim())) return false
  return analysis.issues.length > 0
}

// ── sub-component ─────────────────────────────────────────────
interface AnalysisSectionProps {
  icon: React.ReactNode
  label: string
  labelClass: string
  items?: string[]
  emptyText: string
  itemClass?: string
  ItemIcon?: React.ReactNode
  borderColor?: string
}

function AnalysisSection({
  icon,
  label,
  labelClass,
  items,
  emptyText,
  itemClass,
  ItemIcon,
  borderColor,
}: AnalysisSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge className={`gap-1 border-0 ${labelClass}`}>
          {icon}
          {label}
        </Badge>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className={`text-sm text-foreground flex items-start gap-2 ${borderColor ? `pl-4 border-l-2 ${borderColor}` : ''}`}
            >
              {ItemIcon}
              {item}
            </li>
          ))}
        </ul>
      ) : emptyText ? (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      ) : null}
    </div>
  )
}
