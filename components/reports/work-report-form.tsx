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

  const hasContent = Object.values(report).some((v) => v.trim().length > 0)

  useEffect(() => {
    const totalLength = Object.values(report).join('').length
    if (totalLength > 15) {
      setIsAnalyzing(true)
      const timer = setTimeout(() => {
        setAnalysis({
          status: report.completed ? ['商品詳細ページの実装を完了', 'テストコードの追加を実施'] : [],
          issues: report.blockers ? ['API仕様の確定待ちで作業が停滞'] : [],
          risks: report.blockers ? ['スケジュールに影響する可能性あり'] : [],
          todos: report.nextActions ? ['レビュー依頼を送信', 'テスト環境で動作確認'] : [],
          missingInfo: ['セキュリティレビューの担当者が未定'],
          taskCandidates:
            report.blockers || report.nextActions
              ? ['API仕様の確認依頼', 'テスト環境の準備']
              : [],
        })
        setIsAnalyzing(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setAnalysis(null)
    }
  }, [report])

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
          {!hasContent ? (
            <div className="space-y-4 opacity-60">
              <p className="text-sm text-muted-foreground mb-4">報告を入力すると、AIが以下のように自動整理します:</p>
              {[
                { icon: TrendingUp, color: 'text-success', label: '状況整理', text: '商品詳細ページのレスポンシブ対応を完了' },
                { icon: AlertTriangle, color: 'text-warning', label: '課題', text: 'API仕様の確定待ちで作業が停滞中' },
                { icon: AlertTriangle, color: 'text-destructive', label: 'リスク', text: 'スケジュールへの影響あり（1週間程度）' },
                { icon: ArrowRight, color: 'text-primary', label: '次にやること', text: 'ベンダーへフォローアップ連絡' },
                { icon: HelpCircle, color: 'text-muted-foreground', label: '不足情報', text: 'セキュリティレビューの担当者が未定' },
              ].map(({ icon: Icon, color, label, text }, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <span className={`text-xs font-medium ${color}`}>{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">{text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <AnalysisSection
                icon={<TrendingUp className="h-3 w-3" />}
                label="状況整理"
                labelClass="bg-success/20 text-success"
                items={analysis?.status}
                emptyText="「今日やったこと」から抽出されます"
                itemClass="text-success"
                ItemIcon={<CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />}
              />
              <AnalysisSection
                icon={<AlertTriangle className="h-3 w-3" />}
                label="課題"
                labelClass="bg-warning/20 text-warning"
                items={analysis?.issues}
                emptyText="ブロッカーから抽出されます"
                borderColor="border-warning/50"
              />
              <AnalysisSection
                icon={<AlertTriangle className="h-3 w-3" />}
                label="リスク"
                labelClass="bg-destructive/20 text-destructive"
                items={analysis?.risks}
                emptyText="AIが潜在リスクを検出します"
                borderColor="border-destructive/50"
              />
              <AnalysisSection
                icon={<ArrowRight className="h-3 w-3" />}
                label="次にやること"
                labelClass="bg-primary/20 text-primary"
                items={analysis?.todos}
                emptyText="「次にやること」から抽出されます"
                borderColor="border-primary/50"
              />
              <AnalysisSection
                icon={<HelpCircle className="h-3 w-3" />}
                label="不足情報"
                labelClass=""
                items={analysis?.missingInfo}
                emptyText="AIが確認すべき点を検出します"
                borderColor="border-muted-foreground/30"
              />
              {analysis?.taskCandidates && analysis.taskCandidates.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Badge className="gap-1 bg-primary/20 text-primary border-0">
                      <ListPlus className="h-3 w-3" />
                      タスク候補
                    </Badge>
                    <span className="text-xs text-muted-foreground">カンバンに追加できます</span>
                  </div>
                  <ul className="space-y-2">
                    {analysis.taskCandidates.map((item, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-foreground rounded-md bg-primary/5 px-3 py-2">
                        <span>{item}</span>
                        <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs text-primary hover:text-primary">
                          <Plus className="h-3 w-3" />
                          追加
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── helper sub-component ──────────────────────────────────
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
  icon, label, labelClass, items, emptyText, itemClass, ItemIcon, borderColor,
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
            <li key={i} className={`text-sm text-foreground flex items-start gap-2 ${borderColor ? `pl-4 border-l-2 ${borderColor}` : ''}`}>
              {ItemIcon}
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      )}
    </div>
  )
}
