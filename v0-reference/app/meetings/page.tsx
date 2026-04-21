"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  Clock,
  FileText,
  CheckSquare,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Plus,
  Video,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const upcomingMeetings = [
  {
    id: "1",
    title: "週次定例ミーティング",
    date: "4/21（月）",
    time: "10:00 - 11:00",
    participants: [{ name: "田中太郎" }, { name: "鈴木花子" }, { name: "佐藤次郎" }],
    hasAgenda: true,
  },
  {
    id: "2",
    title: "決済機能レビュー会",
    date: "4/22（火）",
    time: "14:00 - 15:00",
    participants: [{ name: "高橋美咲" }, { name: "田中太郎" }],
    hasAgenda: true,
  },
  {
    id: "3",
    title: "スプリントレトロスペクティブ",
    date: "4/25（金）",
    time: "16:00 - 17:00",
    participants: [
      { name: "田中太郎" },
      { name: "鈴木花子" },
      { name: "佐藤次郎" },
      { name: "高橋美咲" },
    ],
    hasAgenda: false,
  },
]

const pastMeeting = {
  id: "past-1",
  title: "決済API仕様確認ミーティング",
  date: "4/18（金）",
  time: "15:00 - 16:00",
  participants: [{ name: "田中太郎" }, { name: "高橋美咲" }],
  agenda: [
    "決済APIの現状共有",
    "仕様書の到着遅延について",
    "代替案の検討",
    "次のアクション確認",
  ],
  notes:
    "外部ベンダーからの仕様書は来週月曜日に届く予定。それまでの間、代替案としてStripeの利用も検討することに決定。",
  decisions: [
    "仕様書到着まではStripeをバックアップとして調査する",
    "月曜日に仕様書が届かない場合はエスカレーション",
  ],
  unresolvedPoints: [
    { text: "テスト環境でのAPI接続テスト方法", priority: "high", deadline: "次回MTGまで" },
    { text: "本番環境のセキュリティ要件の最終確認", priority: "medium", deadline: "4/25まで" },
    { text: "エラー時のフォールバック仕様", priority: "low", deadline: "未定" },
  ],
  followUpTasks: [
    { id: "t1", title: "Stripe APIの調査", assignee: "高橋美咲", dueDate: "4/21", status: "kanban" as const },
    { id: "t2", title: "ベンダーへのフォローアップ連絡", assignee: "田中太郎", dueDate: "4/21", status: "kanban" as const },
    { id: "t3", title: "セキュリティ要件の洗い出し", assignee: "佐藤次郎", dueDate: "4/22", status: "candidate" as const },
    { id: "t4", title: "テスト環境の準備", assignee: undefined, dueDate: "4/23", status: "pending" as const },
  ],
}

export default function MeetingsPage() {
  const [selectedMeeting, setSelectedMeeting] = useState(pastMeeting)

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">ミーティング</h1>
              <p className="text-sm text-muted-foreground">
                AIがアジェンダと議事録を自動生成します
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              ミーティングを追加
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Meeting List */}
              <div className="space-y-6">
                {/* Upcoming Meetings */}
                <Card className="bg-card">
                  <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">予定されているミーティング</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {upcomingMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Video className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {meeting.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{meeting.date}</span>
                            <span>{meeting.time}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex -space-x-1">
                              {meeting.participants.slice(0, 3).map((p, i) => (
                                <Avatar key={i} className="h-5 w-5 border border-card">
                                  <AvatarFallback className="text-[8px] bg-secondary">
                                    {p.name.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {meeting.hasAgenda && (
                              <Badge variant="secondary" className="text-xs ml-2 gap-1">
                                <Sparkles className="h-3 w-3" />
                                アジェンダ作成済み
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Past Meetings */}
                <Card className="bg-card">
                  <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">過去のミーティング</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() => setSelectedMeeting(pastMeeting)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                        selectedMeeting?.id === pastMeeting.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {pastMeeting.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {pastMeeting.date} {pastMeeting.time}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                        <Sparkles className="h-3 w-3" />
                        議事録あり
                      </Badge>
                    </button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Meeting Details */}
              <div className="lg:col-span-2">
                {selectedMeeting && (
                  <Card className="bg-card">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2 gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI生成
                          </Badge>
                          <CardTitle className="text-xl">{selectedMeeting.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedMeeting.date} {selectedMeeting.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {selectedMeeting.participants.map((p, i) => (
                              <Avatar key={i} className="h-8 w-8 border-2 border-card">
                                <AvatarFallback className="text-xs bg-secondary">
                                  {p.name.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Agenda */}
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          アジェンダ
                        </h4>
                        <ul className="space-y-2 pl-6">
                          {selectedMeeting.agenda.map((item, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground list-decimal"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Meeting Notes */}
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          議事録
                        </h4>
                        <p className="text-sm text-muted-foreground pl-6">
                          {selectedMeeting.notes}
                        </p>
                      </div>

                      {/* Decisions */}
                      <div className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-success">
                          <CheckSquare className="h-4 w-4" />
                          決定事項
                        </h4>
                        <ul className="space-y-2">
                          {selectedMeeting.decisions.map((decision, i) => (
                            <li
                              key={i}
                              className="text-sm text-foreground flex items-start gap-2"
                            >
                              <CheckCircle className="h-4 w-4 shrink-0 text-success mt-0.5" />
                              {decision}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Unresolved Points - With Priority */}
                      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <HelpCircle className="h-4 w-4 text-warning" />
                            未解決の点
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {selectedMeeting.unresolvedPoints.length}件
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {selectedMeeting.unresolvedPoints
                            .sort((a, b) => {
                              const order = { high: 0, medium: 1, low: 2 }
                              return order[a.priority as keyof typeof order] - order[b.priority as keyof typeof order]
                            })
                            .map((point, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start justify-between gap-2 rounded-lg p-2.5",
                                point.priority === "high"
                                  ? "bg-warning/10 border border-warning/30"
                                  : "bg-muted/50"
                              )}
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <Circle className={cn(
                                  "h-3.5 w-3.5 shrink-0 mt-0.5",
                                  point.priority === "high" ? "text-warning" : "text-muted-foreground"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-foreground">{point.text}</span>
                                  <p className="text-xs text-muted-foreground mt-0.5">{point.deadline}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {point.priority === "high" ? (
                                  <Badge className="bg-warning text-warning-foreground text-xs">
                                    要対応
                                  </Badge>
                                ) : point.priority === "medium" ? (
                                  <Badge variant="secondary" className="text-xs">
                                    確認
                                  </Badge>
                                ) : null}
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-primary hover:text-primary">
                                  <Sparkles className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Follow-up Tasks - Show status */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ArrowRight className="h-4 w-4 text-primary" />
                            フォローアップタスク
                          </h4>
                          <Link href="/kanban">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                              カンバンで確認
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                        <div className="space-y-2">
                          {selectedMeeting.followUpTasks.map((task) => (
                            <div
                              key={task.id}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border p-3",
                                task.status === "kanban"
                                  ? "border-success/30 bg-success/5"
                                  : task.status === "candidate"
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-border bg-muted/30"
                              )}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  {task.assignee ? (
                                    <span>担当: {task.assignee}</span>
                                  ) : (
                                    <span className="text-warning">担当者未定</span>
                                  )}
                                  <span>期限: {task.dueDate}</span>
                                </div>
                              </div>
                              {task.status === "kanban" ? (
                                <Badge variant="secondary" className="gap-1 text-xs bg-success/20 text-success border-0">
                                  <CheckCircle className="h-3 w-3" />
                                  カンバンに追加済み
                                </Badge>
                              ) : task.status === "candidate" ? (
                                <Badge variant="secondary" className="gap-1 text-xs bg-primary/20 text-primary border-0">
                                  <Sparkles className="h-3 w-3" />
                                  AI候補に追加
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                                    <Plus className="h-3 w-3" />
                                    カンバンに追加
                                  </Button>
                                  <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 text-primary">
                                    <Sparkles className="h-3 w-3" />
                                    候補へ
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
