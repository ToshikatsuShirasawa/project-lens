import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectMember } from '@/lib/types'

interface MemberSettingsPanelProps {
  members: ProjectMember[]
}

export function MemberSettingsPanel({ members }: MemberSettingsPanelProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>メンバー管理</CardTitle>
          <CardDescription>プロジェクトメンバーの追加・管理を行います</CardDescription>
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
                <AvatarFallback className="bg-secondary">{member.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{member.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn(member.role === 'pm' ? 'bg-primary/20 text-primary' : '')}
                  >
                    {member.role === 'pm' ? (
                      <>
                        <Shield className="mr-1 h-3 w-3" />
                        PM
                      </>
                    ) : (
                      'メンバー'
                    )}
                  </Badge>
                  {member.status === 'invited' && (
                    <Badge variant="outline" className="text-warning border-warning/40">
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
  )
}
