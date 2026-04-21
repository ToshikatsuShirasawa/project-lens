"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { WorkReportForm } from "@/components/reports/work-report-form"
import { ReportHistory } from "@/components/reports/report-history"

const recentReports = [
  {
    id: "1",
    user: { name: "田中太郎" },
    date: "今日 14:30",
    summary: "ユーザー認証機能の実装完了、テストコード追加",
    issuesCount: 0,
    todosCount: 2,
  },
  {
    id: "2",
    user: { name: "鈴木花子" },
    date: "今日 11:00",
    summary: "商品一覧ページのレスポンシブ対応、フィルタリング機能追加",
    issuesCount: 1,
    todosCount: 3,
  },
  {
    id: "3",
    user: { name: "佐藤次郎" },
    date: "昨日 17:45",
    summary: "カート機能のバグ修正、パフォーマンス改善",
    issuesCount: 2,
    todosCount: 1,
  },
  {
    id: "4",
    user: { name: "高橋美咲" },
    date: "昨日 16:00",
    summary: "決済API連携の調査、仕様確認中",
    issuesCount: 1,
    todosCount: 2,
  },
]

export default function ReportsPage() {
  const handleSubmit = (report: unknown) => {
    console.log("[v0] Report submitted:", report)
  }

  const handleSaveDraft = (report: unknown) => {
    console.log("[v0] Draft saved:", report)
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">作業報告</h1>
            <p className="text-sm text-muted-foreground">
              日々の作業内容を記録し、AIが自動で整理します
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <WorkReportForm onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} />
            <ReportHistory reports={recentReports} />
          </div>
        </main>
      </div>
    </div>
  )
}
