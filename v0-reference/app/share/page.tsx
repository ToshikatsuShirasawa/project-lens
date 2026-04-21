"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SummaryCard } from "@/components/share/summary-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCw, Users, UserCog, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "team", label: "チーム向け", icon: Users },
  { id: "pm", label: "PM向け", icon: UserCog },
  { id: "management", label: "経営層向け", icon: Building2 },
] as const

const summaryData = {
  team: {
    title: "ECサイトリニューアル - 週次サマリー",
    currentSituation:
      "フロントエンド開発は予定通り進行中。商品一覧・詳細ページの実装が完了し、現在レビュー待ち。決済機能の実装は外部API仕様の確定待ちで2日遅延。",
    issues: [
      "決済API仕様書の到着が3日遅延中",
      "テスト環境のセットアップがインフラリソース不足で遅延の可能性",
    ],
    risks: [
      "決済機能の遅延がリリーススケジュールに影響する可能性",
      "モバイル対応で想定以上の工数が必要になる可能性",
    ],
    unresolvedPoints: [
      "セキュリティレビューの担当者が未定",
      "ポイント連携の詳細仕様が不明確",
      "エラーハンドリングの方針が未決定",
    ],
    nextActions: [
      "決済ベンダーへのフォローアップ連絡（田中）",
      "商品一覧ページのコードレビュー（鈴木）",
      "テスト計画書の作成開始（佐藤）",
    ],
  },
  pm: {
    title: "ECサイトリニューアル - PM向けステータス",
    currentSituation:
      "全体進捗68%。フロントエンド85%完了、バックエンド60%完了、インフラ40%完了。クリティカルパスは決済機能の実装。",
    issues: [
      "決済API仕様の遅延により、決済機能の実装開始が遅れている",
      "インフラチームのリソース不足でテスト環境準備に影響",
    ],
    risks: [
      "決済機能の遅延が全体スケジュールに1週間の影響を与える可能性（確率: 中）",
      "UAT開始日が未定のため、リリース日程の再調整が必要になる可能性",
    ],
    unresolvedPoints: [
      "セキュリティ監査のスコープと担当者の決定",
      "本番環境のインフラ構成の最終承認",
      "既存ポイントシステムとの連携方式",
    ],
    nextActions: [
      "ベンダーとのエスカレーションミーティング設定",
      "リスク対応の代替案検討（決済機能の段階的リリース）",
      "インフラチームとのリソース調整会議",
    ],
  },
  management: {
    title: "ECサイトリニューアル - エグゼクティブサマリー",
    currentSituation:
      "プロジェクト進捗率68%、予定対比で軽微な遅延あり。主要機能の開発は順調に進行中だが、外部連携部分にリスクが存在。",
    issues: ["外部決済ベンダーとの連携調整に遅延が発生"],
    risks: [
      "最悪のケースでリリース日が1週間後ろ倒しになる可能性あり",
      "ただし、段階的リリースによるリスク軽減策を検討中",
    ],
    unresolvedPoints: [
      "最終的なリリース日程の確定（来週のステコミで決定予定）",
    ],
    nextActions: [
      "来週のステアリングコミッティでリリース日程を最終決定",
      "必要に応じてベンダーとの追加交渉を実施",
    ],
  },
}

export default function SharePage() {
  const [activeTab, setActiveTab] = useState<"team" | "pm" | "management">("team")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleRegenerate = () => {
    setIsGenerating(true)
    setTimeout(() => setIsGenerating(false), 1500)
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">共有用レポート</h1>
              <p className="text-sm text-muted-foreground">
                プロジェクトサマリーを生成して共有します
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI生成
              </Badge>
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                再生成
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 rounded-lg bg-secondary/50 w-fit">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Summary Card */}
            <SummaryCard data={summaryData[activeTab]} variant={activeTab} />
          </div>
        </main>
      </div>
    </div>
  )
}
