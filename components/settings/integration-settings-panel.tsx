import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Trash2, Hash, CheckCircle, AlertCircle } from 'lucide-react'

const slackChannels = [
  { id: '1', name: 'ec-renewal', syncStatus: 'synced' as const, lastSync: '5分前', messageCount: 1234 },
  { id: '2', name: 'dev-team', syncStatus: 'synced' as const, lastSync: '10分前', messageCount: 892 },
  { id: '3', name: 'design-review', syncStatus: 'error' as const, lastSync: '1時間前', messageCount: 456 },
]

export function IntegrationSettingsPanel() {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Slackチャンネル連携</CardTitle>
          <CardDescription>AIが分析するSlackチャンネルを管理します</CardDescription>
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
                  <span className="font-medium text-foreground">#{channel.name}</span>
                  {channel.syncStatus === 'synced' ? (
                    <Badge variant="secondary" className="gap-1 bg-success/20 text-success border-0">
                      <CheckCircle className="h-3 w-3" />
                      同期済み
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 bg-destructive/20 text-destructive border-0">
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
  )
}
