"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Save, Send, Loader2, CheckCircle, AlertTriangle, ArrowRight, HelpCircle, TrendingUp, ListPlus, Plus } from "lucide-react"

interface WorkReportFormProps {
  onSubmit?: (report: WorkReport) => void
  onSaveDraft?: (report: WorkReport) => void
}

interface WorkReport {
  completed: string
  inProgress: string
  blockers: string
  nextActions: string
}

interface AIAnalysis {
  status: string[]
  issues: string[]
  risks: string[]
  todos: string[]
  missingInfo: string[]
  taskCandidates: string[]
}

export function WorkReportForm({ onSubmit, onSaveDraft }: WorkReportFormProps) {
  const [report, setReport] = useState<WorkReport>({
    completed: "",
    inProgress: "",
    blockers: "",
    nextActions: "",
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasContent =
    report.completed || report.inProgress || report.blockers || report.nextActions

  // Live analysis effect
  useEffect(() => {
    const totalLength = Object.values(report).join("").length
    if (totalLength > 15) {
      setIsAnalyzing(true)
      const timer = setTimeout(() => {
        setAnalysis({
          status: report.completed
            ? ["商品詳細ページの実装を完了", "テストコードの追加を実施"]
            : [],
          issues: report.blockers ? ["API仕様の確定待ちで作業が停滞"] : [],
          risks: report.blockers ? ["スケジュールに影響する可能性あり"] : [],
          todos: report.nextActions ? ["レビュー依頼を送信", "テスト環境で動作確認"] : [],
          missingInfo: ["セキュリティレビューの担当者が未定"],
          taskCandidates: report.blockers || report.nextActions
            ? ["API仕様の確認依頼", "テスト環境の準備"]
            : [],
        })
        setIsAnalyzing(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setAnalysis(null)
    }
  }, [report])

  const handleChange = (field: keyof WorkReport, value: string) => {
    setReport({ ...report, [field]: value })
  }

  const handleSubmit = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      onSubmit?.(report)
      setIsSubmitting(false)
      setReport({ completed: "", inProgress: "", blockers: "", nextActions: "" })
      setAnalysis(null)
    }, 1000)
  }

  const handleSaveDraft = () => {
    onSaveDraft?.(report)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Report Form */}
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">今日の作業報告</CardTitle>
          <p className="text-sm text-muted-foreground">
            1〜2分で記録できる軽量な日報です
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              今日やったこと
            </label>
            <Textarea
              value={report.completed}
              onChange={(e) => handleChange("completed", e.target.value)}
              placeholder="例: 商品詳細ページのレスポンシブ対応を完了しました。画像ギャラリーのスワイプ機能も追加。"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              現在取り組んでいること
            </label>
            <Textarea
              value={report.inProgress}
              onChange={(e) => handleChange("inProgress", e.target.value)}
              placeholder="例: カート機能のセッション管理を実装中。明日の午前中には完了予定。"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              困っていること・ブロッカー
            </label>
            <Textarea
              value={report.blockers}
              onChange={(e) => handleChange("blockers", e.target.value)}
              placeholder="例: 決済APIの仕様書がまだ届いていないため、連携部分の実装が進められません。"
              rows={2}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">
              なければ空欄でOKです
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              次にやること
            </label>
            <Textarea
              value={report.nextActions}
              onChange={(e) => handleChange("nextActions", e.target.value)}
              placeholder="例: 明日は決済APIの代替案としてStripeの調査を進めます。"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!hasContent}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              下書き保存
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!hasContent || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              報告を送信
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
            <p className="text-sm text-muted-foreground">
              入力内容をリアルタイムで整理します
            </p>
          </div>
          {isAnalyzing && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </CardHeader>
        <CardContent>
          {!hasContent ? (
            // Empty State - Show realistic example output
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                報告を入力すると、AIが以下のように自動整理します:
              </p>
              
              <div className="space-y-4 opacity-70">
                {/* Status Example */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs font-medium text-success">状況整理</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">商品詳細ページのレスポンシブ対応を完了</p>
                </div>
                
                {/* Issue Example */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs font-medium text-warning">課題</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">API仕様の確定待ちで作業が停滞中</p>
                </div>
                
                {/* Risk Example */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive">リスク</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">スケジュールへの影響あり（1週間程度）</p>
                </div>
                
                {/* TODO Example */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">次にやること</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">ベンダーへフォローアップ連絡</p>
                </div>
                
                {/* Missing Info Example */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">不足情報</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">セキュリティレビューの担当者が未定</p>
                </div>
                
                {/* Task Candidates Example */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <ListPlus className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">タスク候補</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">API仕様の確認依頼</p>
                  <p className="text-xs text-muted-foreground pl-5">テスト環境の準備</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Updates */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="gap-1 bg-success/20 text-success border-0">
                    <TrendingUp className="h-3 w-3" />
                    状況整理
                  </Badge>
                </div>
                {analysis?.status && analysis.status.length > 0 ? (
                  <ul className="space-y-1.5">
                    {analysis.status.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    「今日やったこと」から抽出されます
                  </p>
                )}
              </div>

              {/* Issues */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="gap-1 bg-warning/20 text-warning border-0">
                    <AlertTriangle className="h-3 w-3" />
                    課題
                  </Badge>
                </div>
                {analysis?.issues && analysis.issues.length > 0 ? (
                  <ul className="space-y-1.5">
                    {analysis.issues.map((item, i) => (
                      <li key={i} className="text-sm text-foreground pl-4 border-l-2 border-warning/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    ブロッカーから抽出されます
                  </p>
                )}
              </div>

              {/* Risks */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="gap-1 bg-destructive/20 text-destructive border-0">
                    <AlertTriangle className="h-3 w-3" />
                    リスク
                  </Badge>
                </div>
                {analysis?.risks && analysis.risks.length > 0 ? (
                  <ul className="space-y-1.5">
                    {analysis.risks.map((item, i) => (
                      <li key={i} className="text-sm text-foreground pl-4 border-l-2 border-destructive/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    AIが潜在リスクを検出します
                  </p>
                )}
              </div>

              {/* TODOs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="gap-1 bg-primary/20 text-primary border-0">
                    <ArrowRight className="h-3 w-3" />
                    次にやること
                  </Badge>
                </div>
                {analysis?.todos && analysis.todos.length > 0 ? (
                  <ul className="space-y-1.5">
                    {analysis.todos.map((item, i) => (
                      <li key={i} className="text-sm text-foreground pl-4 border-l-2 border-primary/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    「次にやること」から抽出されます
                  </p>
                )}
              </div>

              {/* Missing Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <HelpCircle className="h-3 w-3" />
                    不足情報
                  </Badge>
                </div>
                {analysis?.missingInfo && analysis.missingInfo.length > 0 ? (
                  <ul className="space-y-1.5">
                    {analysis.missingInfo.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-muted-foreground/30">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    AIが確認すべき点を検出します
                  </p>
                )}
              </div>

              {/* Task Candidates */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Badge className="gap-1 bg-primary/20 text-primary border-0">
                    <ListPlus className="h-3 w-3" />
                    タスク候補
                  </Badge>
                  <span className="text-xs text-muted-foreground">カンバンに追加できます</span>
                </div>
                {analysis?.taskCandidates && analysis.taskCandidates.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    タスクになりそうな内容を検出します
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
