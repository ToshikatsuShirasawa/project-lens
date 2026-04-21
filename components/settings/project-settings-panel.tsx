'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'

interface ProjectSettingsPanelProps {
  projectName: string
  projectDescription: string
}

export function ProjectSettingsPanel({ projectName: initialName, projectDescription: initialDesc }: ProjectSettingsPanelProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDesc)

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>プロジェクト基本情報</CardTitle>
          <CardDescription>プロジェクトの基本的な情報を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">プロジェクト名</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
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
          <CardDescription>この操作は取り消すことができません</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            プロジェクトを削除
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
