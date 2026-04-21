"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  Users,
  Hash,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "general", label: "基本設定", icon: Settings },
  { id: "members", label: "メンバー管理", icon: Users },
  { id: "slack", label: "Slack連携", icon: Hash },
  { id: "ai", label: "AI設定", icon: Sparkles },
] as const

const members = [
  { id: "1", name: "田中太郎", email: "tanaka@example.com", role: "pm", status: "active" },
  { id: "2", name: "鈴木花子", email: "suzuki@example.com", role: "member", status: "active" },
  { id: "3", name: "佐藤次郎", email: "sato@example.com", role: "member", status: "active" },
  { id: "4", name: "高橋美咲", email: "takahashi@example.com", role: "member", status: "active" },
  { id: "5", name: "伊藤健一", email: "ito@example.com", role: "member", status: "invited" },
]

const slackChannels = [
  { id: "1", name: "ec-renewal", syncStatus: "synced", lastSync: "5分前", messageCount: 1234 },
  { id: "2", name: "dev-team", syncStatus: "synced", lastSync: "10分前", messageCount: 892 },
  { id: "3", name: "design-review", syncStatus: "error", lastSync: "1時間前", messageCount: 456 },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "members" | "slack" | "ai">("general")
  const [projectName, setProjectName] = useState("ECサイトリニューアル")
  const [projectDescription, setProjectDescription] = useState(
    "既存ECサイトのフルリニューアルプロジェクト。新しいデザインシステムとモダンな技術スタックへの移行。"
  )

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">設定</h1>
            <p className="text-sm text-muted-foreground">
              プロジェクトの設定と管理を行います
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-6">
              {/* Tab Navigation */}
              <div className="w-48 shrink-0 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        activeTab === tab.id
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="flex-1 space-y-6">
                {/* General Settings */}
                {activeTab === "general" && (
                  <>
                    <Card className="bg-card">
                      <CardHeader>
                        <CardTitle>プロジェクト基本情報</CardTitle>
                        <CardDescription>
                          プロジェクトの基本的な情報を設定します
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">プロジェクト名</label>
                          <Input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">説明</label>
                          <textarea
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">ステータス</label>
                          <Select defaultValue="active">
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">進行中</SelectItem>
                              <SelectItem value="paused">一時停止</SelectItem>
                              <SelectItem value="completed">完了</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="mt-4">変更を保存</Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-destructive/50">
                      <CardHeader>
                        <CardTitle className="text-destructive">危険な操作</CardTitle>
                        <CardDescription>
                          この操作は取り消すことができません
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="destructive" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          プロジェクトを削除
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Member Management */}
                {activeTab === "members" && (
                  <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>メンバー管理</CardTitle>
                        <CardDescription>
                          プロジェクトメンバーの追加・管理を行います
                        </CardDescription>
                      </div>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        メンバーを招待
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-3"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-secondary">
                                {member.name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {member.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    member.role === "pm"
                                      ? "bg-primary/20 text-primary"
                                      : ""
                                  )}
                                >
                                  {member.role === "pm" ? (
                                    <>
                                      <Shield className="mr-1 h-3 w-3" />
                                      PM
                                    </>
                                  ) : (
                                    "メンバー"
                                  )}
                                </Badge>
                                {member.status === "invited" && (
                                  <Badge variant="outline" className="text-warning">
                                    招待中
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            <Select defaultValue={member.role}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pm">PM</SelectItem>
                                <SelectItem value="member">メンバー</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Slack Integration */}
                {activeTab === "slack" && (
                  <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Slackチャンネル連携</CardTitle>
                        <CardDescription>
                          AIが分析するSlackチャンネルを管理します
                        </CardDescription>
                      </div>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        チャンネルを追加
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {slackChannels.map((channel) => (
                          <div
                            key={channel.id}
                            className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-3"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
                              <Hash className="h-5 w-5 text-chart-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  #{channel.name}
                                </span>
                                {channel.syncStatus === "synced" ? (
                                  <Badge variant="secondary" className="gap-1 bg-success/20 text-success">
                                    <CheckCircle className="h-3 w-3" />
                                    同期済み
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1 bg-destructive/20 text-destructive">
                                    <AlertCircle className="h-3 w-3" />
                                    エラー
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                最終同期: {channel.lastSync} • {channel.messageCount.toLocaleString()}件のメッセージ
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Settings */}
                {activeTab === "ai" && (
                  <>
                    <Card className="bg-card">
                      <CardHeader>
                        <CardTitle>AI分析設定</CardTitle>
                        <CardDescription>
                          AIによる自動分析の設定を行います
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-sm font-medium">自動分析</label>
                            <p className="text-sm text-muted-foreground">
                              Slackメッセージを自動的に分析してダッシュボードを更新
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-sm font-medium">カンバンカードの自動生成</label>
                            <p className="text-sm text-muted-foreground">
                              会話からタスクを検出してカンバンに追加
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-sm font-medium">リスク通知</label>
                            <p className="text-sm text-muted-foreground">
                              重大なリスクを検出した際に通知
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-sm font-medium">アジェンダ自動生成</label>
                            <p className="text-sm text-muted-foreground">
                              ミーティングのアジェンダを自動生成
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardHeader>
                        <CardTitle>同期頻度</CardTitle>
                        <CardDescription>
                          Slackからデータを取得する頻度を設定します
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select defaultValue="15">
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5分ごと</SelectItem>
                            <SelectItem value="15">15分ごと</SelectItem>
                            <SelectItem value="30">30分ごと</SelectItem>
                            <SelectItem value="60">1時間ごと</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
