"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Hash, Share2, Clock } from "lucide-react"

interface DashboardHeaderProps {
  projectName: string
  status: "順調" | "注意" | "遅延"
  lastUpdated: string
  channels: string[]
  members: { name: string; avatar?: string }[]
  onGenerateReport?: () => void
}

const statusConfig = {
  "順調": { variant: "default" as const, className: "bg-success text-success-foreground" },
  "注意": { variant: "default" as const, className: "bg-warning text-warning-foreground" },
  "遅延": { variant: "default" as const, className: "bg-destructive text-destructive-foreground" },
}

export function DashboardHeader({
  projectName,
  status,
  lastUpdated,
  channels,
  members,
  onGenerateReport,
}: DashboardHeaderProps) {
  const statusStyle = statusConfig[status]

  return (
    <header className="border-b border-border bg-card px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{projectName}</h1>
            <Badge className={statusStyle.className}>{status}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              <span>最終更新: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {channels.map((channel) => (
                <Badge key={channel} variant="secondary" className="gap-1 h-6 px-2">
                  <Hash className="h-3 w-3 shrink-0" />
                  <span>{channel}</span>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member, i) => (
              <Avatar key={i} className="h-9 w-9 border-2 border-card">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                  {member.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
                +{members.length - 5}
              </div>
            )}
          </div>

          <Button onClick={onGenerateReport} className="gap-2 h-9">
            <Share2 className="h-4 w-4" />
            共有用レポートを作成
          </Button>
        </div>
      </div>
    </header>
  )
}
