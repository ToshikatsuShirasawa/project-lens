'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Brain, Zap, Clock, FileText, MessageSquare, CalendarDays } from 'lucide-react'

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  description: string
  defaultEnabled?: boolean
}

function ToggleRow({ icon, label, description, defaultEnabled = true }: ToggleRowProps) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          enabled ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export function AiSettingsPanel() {
  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>AIモデル設定</CardTitle>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
              <Zap className="mr-1 h-3 w-3" />
              Beta
            </Badge>
          </div>
          <CardDescription>分析に使用するAIモデルと動作を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">使用モデル</label>
            <Select defaultValue="claude-sonnet-4-6">
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-opus-4-7">Claude Opus 4.7（最高精度）</SelectItem>
                <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6（推奨）</SelectItem>
                <SelectItem value="claude-haiku-4-5">Claude Haiku 4.5（高速）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">分析頻度</label>
            <Select defaultValue="realtime">
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">リアルタイム（入力のたびに分析）</SelectItem>
                <SelectItem value="onsubmit">送信時のみ</SelectItem>
                <SelectItem value="manual">手動実行のみ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">分析言語</label>
            <Select defaultValue="ja">
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI分析の対象設定
          </CardTitle>
          <CardDescription>どのデータをAIに分析させるか選択します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={<MessageSquare className="h-5 w-5" />}
            label="Slackメッセージ分析"
            description="連携チャンネルのメッセージからリスク・課題を自動検出"
            defaultEnabled={true}
          />
          <ToggleRow
            icon={<FileText className="h-5 w-5" />}
            label="作業報告書の分析"
            description="提出された作業報告からタスク候補・ブロッカーを抽出"
            defaultEnabled={true}
          />
          <ToggleRow
            icon={<CalendarDays className="h-5 w-5" />}
            label="議事録の分析"
            description="ミーティング記録から未解決事項・フォローアップを追跡"
            defaultEnabled={true}
          />
          <ToggleRow
            icon={<Clock className="h-5 w-5" />}
            label="スケジュールリスク検出"
            description="期限遅延のリスクをAIが先行して検知・アラート"
            defaultEnabled={false}
          />
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>意思決定カードの設定</CardTitle>
          <CardDescription>ダッシュボードに表示する意思決定カードの動作を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">カードの最大表示数</label>
            <Select defaultValue="3">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1件</SelectItem>
                <SelectItem value="3">3件（推奨）</SelectItem>
                <SelectItem value="5">5件</SelectItem>
                <SelectItem value="10">10件</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">緊急度しきい値</label>
            <Select defaultValue="medium">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高のみ表示</SelectItem>
                <SelectItem value="medium">中以上を表示（推奨）</SelectItem>
                <SelectItem value="low">すべて表示</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="mt-2">設定を保存</Button>
        </CardContent>
      </Card>
    </div>
  )
}
