'use client'

import { useState } from 'react'
import { MeetingsList } from '@/components/meetings/meetings-list'
import { MeetingDetail } from '@/components/meetings/meeting-detail'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { mockUpcomingMeetings, mockPastMeetings } from '@/lib/mock/meetings'
import type { Meeting } from '@/lib/types'

interface MeetingsClientProps {
  projectId: string
}

export function MeetingsClient({ projectId }: MeetingsClientProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(mockPastMeetings[0])

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ミーティング</h1>
          <p className="text-sm text-muted-foreground">AIがアジェンダと議事録を自動生成します</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          ミーティングを追加
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <MeetingsList
          upcomingMeetings={mockUpcomingMeetings}
          pastMeetings={mockPastMeetings}
          selectedMeetingId={selectedMeeting?.id ?? null}
          onSelectMeeting={setSelectedMeeting}
        />
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <MeetingDetail meeting={selectedMeeting} projectId={projectId} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">ミーティングを選択してください</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
