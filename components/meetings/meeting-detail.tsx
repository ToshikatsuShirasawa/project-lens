'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  FileText,
  CheckSquare,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Plus,
  CheckCircle,
  Circle,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Meeting } from '@/lib/types'

interface MeetingDetailProps {
  meeting: Meeting
  projectId: string
}

const priorityConfig = {
  high: { label: '要対応', class: 'bg-warning text-warning-foreground', dotClass: 'text-warning', rowClass: 'bg-warning/10 border border-warning/30' },
  medium: { label: '確認', class: 'bg-secondary text-secondary-foreground', dotClass: 'text-muted-foreground', rowClass: 'bg-muted/50' },
  low: { label: '', class: '', dotClass: 'text-muted-foreground', rowClass: 'bg-muted/30' },
}

const taskStatusConfig = {
  kanban: { label: 'カンバンに追加済み', class: 'bg-success/20 text-success border-0 gap-1', Icon: CheckCircle, rowClass: 'border-success/30 bg-success/5' },
  candidate: { label: 'AI候補に追加', class: 'bg-primary/20 text-primary border-0 gap-1', Icon: Sparkles, rowClass: 'border-primary/30 bg-primary/5' },
  pending: { label: '', class: '', Icon: null, rowClass: 'border-border bg-muted/30' },
}

export function MeetingDetail({ meeting, projectId }: MeetingDetailProps) {
  return (
    <Card className="bg-card h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="secondary" className="mb-2 gap-1">
              <Sparkles className="h-3 w-3" />
              AI生成
            </Badge>
            <CardTitle className="text-xl">{meeting.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {meeting.date} {meeting.time}
            </p>
          </div>
          <div className="flex -space-x-2">
            {meeting.participants.map((p, i) => (
              <Avatar key={i} className="h-8 w-8 border-2 border-card">
                <AvatarFallback className="text-xs bg-secondary">{p.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agenda */}
        {meeting.agenda && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              アジェンダ
            </h4>
            <ul className="space-y-2 pl-6">
              {meeting.agenda.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground list-decimal">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {meeting.notes && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              議事録
            </h4>
            <p className="text-sm text-muted-foreground pl-6 leading-relaxed">{meeting.notes}</p>
          </div>
        )}

        {/* Decisions */}
        {meeting.decisions && meeting.decisions.length > 0 && (
          <div className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-success">
              <CheckSquare className="h-4 w-4" />
              決定事項
            </h4>
            <ul className="space-y-2">
              {meeting.decisions.map((d, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-success mt-0.5" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Unresolved Points */}
        {meeting.unresolvedPoints && meeting.unresolvedPoints.length > 0 && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HelpCircle className="h-4 w-4 text-warning" />
                未解決の点
              </h4>
              <Badge variant="secondary" className="text-xs">
                {meeting.unresolvedPoints.length}件
              </Badge>
            </div>
            <div className="space-y-2">
              {[...meeting.unresolvedPoints]
                .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
                .map((point, i) => {
                  const cfg = priorityConfig[point.priority]
                  return (
                    <div key={i} className={cn('flex items-start justify-between gap-2 rounded-lg p-2.5', cfg.rowClass)}>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Circle className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', cfg.dotClass)} />
                        <div className="flex-1">
                          <span className="text-sm text-foreground">{point.text}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{point.deadline}</p>
                        </div>
                      </div>
                      {cfg.label && (
                        <Badge className={cn('text-xs shrink-0', cfg.class)}>{cfg.label}</Badge>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Follow-up Tasks */}
        {meeting.followUpTasks && meeting.followUpTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ArrowRight className="h-4 w-4 text-primary" />
                フォローアップタスク
              </h4>
              <Link href={`/projects/${projectId}/kanban`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  カンバンで確認
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {meeting.followUpTasks.map((task) => {
                const cfg = taskStatusConfig[task.status]
                return (
                  <div key={task.id} className={cn('flex items-center gap-3 rounded-lg border p-3', cfg.rowClass)}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {task.assignee ? (
                          <span>担当: {task.assignee}</span>
                        ) : (
                          <span className="text-warning">担当者未定</span>
                        )}
                        <span>期限: {task.dueDate}</span>
                      </div>
                    </div>
                    {task.status === 'pending' ? (
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
                    ) : (
                      cfg.Icon && (
                        <Badge className={cn('text-xs', cfg.class)}>
                          <cfg.Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
