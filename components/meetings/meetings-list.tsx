'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Clock, Video, FileText, Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Meeting } from '@/lib/types'

interface MeetingsListProps {
  upcomingMeetings: Meeting[]
  pastMeetings: Meeting[]
  selectedMeetingId: string | null
  onSelectMeeting: (meeting: Meeting) => void
}

export function MeetingsList({
  upcomingMeetings,
  pastMeetings,
  selectedMeetingId,
  onSelectMeeting,
}: MeetingsListProps) {
  return (
    <div className="space-y-6">
      {/* Upcoming */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">予定されているミーティング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingMeetings.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/50 cursor-pointer"
              onClick={() => onSelectMeeting(m)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Video className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">{m.title}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{m.date}</span>
                  <span>{m.time}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex -space-x-1">
                    {m.participants.slice(0, 3).map((p, i) => (
                      <Avatar key={i} className="h-5 w-5 border border-card">
                        <AvatarFallback className="text-[8px] bg-secondary">
                          {p.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {m.hasAgenda && (
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

      {/* Past */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">過去のミーティング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pastMeetings.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMeeting(m)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selectedMeetingId === m.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-secondary/30 hover:bg-secondary/50'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">{m.title}</h4>
                <p className="text-xs text-muted-foreground">{m.date} {m.time}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                議事録あり
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
