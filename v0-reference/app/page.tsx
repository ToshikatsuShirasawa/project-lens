"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TopPriorityCard } from "@/components/dashboard/top-priority-card"
import { ProjectStatusCard } from "@/components/dashboard/project-status-card"
import { IssuesRisksCard } from "@/components/dashboard/issues-risks-card"
import { MissingInfoCard } from "@/components/dashboard/missing-info-card"
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card"
import { TaskCandidatesCard } from "@/components/dashboard/task-candidates-card"

// Mock data
const projectData = {
  name: "ECサイトリニューアル",
  status: "注意" as const,
  lastUpdated: "5分前",
  channels: ["ec-renewal", "dev-team"],
  members: [
    { name: "田中太郎" },
    { name: "鈴木花子" },
    { name: "佐藤次郎" },
    { name: "高橋美咲" },
    { name: "伊藤健一" },
    { name: "山田優子" },
  ],
}

const topPriority = {
  situation: "決済API仕様書が3日遅延中",
  context: "外部ベンダーからの回答待ちが続いています。メールでの催促は2回実施済みですが、返答がありません。このままではリリースに影響が出る可能性があります。",
  urgency: "critical" as const,
  delayDays: 3,
  daysUntilDeadline: 5,
  impactTimeline: [
    { days: 3, description: "リリース延期確定", severity: "critical" as const },
    { days: 5, description: "テスト工程に影響", severity: "critical" as const },
    { days: 7, description: "顧客への遅延連絡", severity: "warning" as const },
  ],
  actionTimeline: [
    { timing: "今日", action: "ベンダーに電話連絡", outcome: "状況と納期を確認" },
    { timing: "明日", action: "納期確定", outcome: "プロジェクト計画を更新" },
    { timing: "週内", action: "開発再開", outcome: "遅延を回避" },
  ],
  aiDecision: "本日中にベンダーへ電話連絡する",
  aiReason: "メールでの催促は2回失敗しており、直接連絡が必要です。電話連絡により、即日で状況確認と具体的な納期を取得できる可能性が高いです。",
  alternatives: [
    { label: "Stripeに切り替え", effort: "medium" as const, impact: "medium" as const, href: "/kanban" },
    { label: "リリース延期", effort: "low" as const, impact: "high" as const, href: "/kanban" },
    { label: "上長にエスカレーション", effort: "low" as const, impact: "medium" as const, href: "/kanban" },
  ],
  primaryAction: {
    label: "ベンダーに電話連絡する",
    href: "/kanban",
    purpose: "遅延確定を防ぐ",
    outcome: "具体的な納期回答を取得し、プロジェクト計画を更新",
    expectedTimeline: "本日中に状況確定見込み",
  },
}

// Status card focuses on overall project health, not duplicating top priority
const statusData = {
  summary:
    "フロントエンド開発は順調に進行中。決済API待ちの影響で一部タスクがブロック状態ですが、並行可能な作業は予定通り進んでいます。",
  progress: 68,
  bottleneck: "決済API待ちの影響で、テスト計画の詳細策定がブロックされています。",
  bottleneckSource: "ai" as const,
  bottleneckDelayDays: 2,
  nextAction: "ブロックされていない作業を優先的に完了させる",
  overallUrgency: "warning" as const,
  daysUntilMilestone: 12,
  aiRecommendation: "決済API以外の作業を先行完了させましょう",
  aiRecommendationReason: "7件のタスクがAPI待ちなしで完了可能です",
  actions: [
    { label: "並行可能タスクを確認", href: "/kanban", isRecommended: true },
    { label: "進捗を報告", href: "/report" },
  ],
}

// Note: Removed "決済API仕様の遅延" as it's already featured in top priority card
// Issues section now shows analysis/breakdown of other concerns
const issues = [
  {
    id: "2",
    title: "テスト環境の構築遅れ",
    description: "インフラチームのリソース不足により、テスト環境の準備が遅れる可能性があります",
    severity: "medium" as const,
    source: "report" as const,
    urgency: "warning" as const,
    daysUntilDeadline: 5,
    aiRecommendation: "インフラチームの優先度調整を依頼",
  },
  {
    id: "3",
    title: "モバイル対応の工数増加リスク",
    description: "想定以上のブレークポイント対応が必要になる可能性をAIが検出しました",
    severity: "low" as const,
    source: "ai" as const,
    urgency: "normal" as const,
  },
  {
    id: "4",
    title: "ポイント連携の仕様不明確",
    description: "既存ポイントシステムとの連携方法が未確定のまま開発が進んでいます",
    severity: "medium" as const,
    source: "meeting" as const,
    urgency: "warning" as const,
    daysUntilDeadline: 10,
    aiRecommendation: "今週中に仕様確認MTGを設定",
  },
]

const missingItems = [
  {
    id: "1",
    type: "assignee" as const,
    title: "セキュリティレビューの担当者",
    context: "決済機能のセキュリティ監査を担当する人が未定",
    source: "ai" as const,
  },
  {
    id: "2",
    type: "deadline" as const,
    title: "ユーザー受け入れテストの開始日",
    context: "テスト計画書に記載がありません",
    source: "report" as const,
  },
  {
    id: "3",
    type: "decision" as const,
    title: "エラーハンドリングの方針",
    context: "決済エラー時のユーザー導線が未決定",
    source: "meeting" as const,
  },
  {
    id: "4",
    type: "requirement" as const,
    title: "ポイント連携の詳細仕様",
    context: "既存ポイントシステムとの連携方法が不明確",
    source: "slack" as const,
  },
]

const taskCandidates = [
  {
    id: "c1",
    title: "API仕様書の確認依頼",
    reason: "Slackで「仕様書の確認をお願いします」という発言を検出",
    source: "slack" as const,
    suggestedAssignee: "高橋美咲",
    suggestedDueDate: "4/22",
  },
  {
    id: "c2",
    title: "テスト環境の準備",
    reason: "作業報告に「テスト環境が必要」と記載あり",
    source: "report" as const,
    suggestedAssignee: "佐藤次郎",
  },
  {
    id: "c3",
    title: "セキュリティレビューの手配",
    reason: "議事録から「セキュリティ確認が必要」という決定事項を抽出",
    source: "meeting" as const,
    suggestedDueDate: "4/25",
  },
  {
    id: "c4",
    title: "エラーハンドリングの方針決め",
    reason: "複数の議事録で「エラー処理」が未解決事項として残っている",
    source: "meeting" as const,
  },
]

const activities = [
  {
    id: "1",
    type: "report" as const,
    title: "作業報告が追加されました",
    description: "フロントエンド: 商品一覧ページのレスポンシブ対応完了",
    user: { name: "鈴木花子" },
    timestamp: "10分前",
  },
  {
    id: "2",
    type: "ai" as const,
    title: "新しい課題を検出しました",
    description: "Slackの会話から決済API遅延に関するリスクを特定",
    timestamp: "30分前",
  },
  {
    id: "3",
    type: "kanban" as const,
    title: "カンバンカードが更新されました",
    description: "「商品詳細ページ」が「レビュー中」に移動",
    user: { name: "田中太郎" },
    timestamp: "1時間前",
  },
  {
    id: "4",
    type: "slack" as const,
    title: "Slack同期が完了しました",
    description: "#ec-renewal か���15件の新しいメッセージを分析",
    timestamp: "2時間前",
  },
  {
    id: "5",
    type: "report" as const,
    title: "作業報告が追加されました",
    description: "バックエンド: 商品APIのパフォーマンス改善",
    user: { name: "佐藤次郎" },
    timestamp: "3時間前",
  },
]

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          projectName={projectData.name}
          status={projectData.status}
          lastUpdated={projectData.lastUpdated}
          channels={projectData.channels}
          members={projectData.members}
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* AI Decision Card */}
            <TopPriorityCard
              situation={topPriority.situation}
              context={topPriority.context}
              urgency={topPriority.urgency}
              delayDays={topPriority.delayDays}
              daysUntilDeadline={topPriority.daysUntilDeadline}
              impactTimeline={topPriority.impactTimeline}
              actionTimeline={topPriority.actionTimeline}
              aiDecision={topPriority.aiDecision}
              aiReason={topPriority.aiReason}
              alternatives={topPriority.alternatives}
              primaryAction={topPriority.primaryAction}
            />

            {/* Main Content - Status, Issues, and AI Candidates */}
            <div className="grid gap-6 lg:grid-cols-3">
              <ProjectStatusCard
                summary={statusData.summary}
                progress={statusData.progress}
                bottleneck={statusData.bottleneck}
                bottleneckSource={statusData.bottleneckSource}
                bottleneckDelayDays={statusData.bottleneckDelayDays}
                nextAction={statusData.nextAction}
                overallUrgency={statusData.overallUrgency}
                daysUntilMilestone={statusData.daysUntilMilestone}
                aiRecommendation={statusData.aiRecommendation}
                aiRecommendationReason={statusData.aiRecommendationReason}
                actions={statusData.actions}
              />
              <IssuesRisksCard issues={issues} />
              <TaskCandidatesCard candidates={taskCandidates} />
            </div>

            {/* Secondary Content - Missing Info and Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
              <MissingInfoCard items={missingItems} />
              <RecentActivityCard activities={activities} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
