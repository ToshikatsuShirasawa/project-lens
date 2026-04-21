"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Calendar,
  Settings,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const projects = [
  { id: "1", name: "ECサイトリニューアル", status: "進行中" },
  { id: "2", name: "モバイルアプリ開発", status: "計画中" },
  { id: "3", name: "社内ツール刷新", status: "完了" },
]

const navigation = [
  { name: "ダッシュボード", href: "/", icon: LayoutDashboard },
  { name: "カンバン", href: "/kanban", icon: Kanban },
  { name: "作業報告", href: "/reports", icon: FileText },
  { name: "ミーティング", href: "/meetings", icon: Calendar },
  { name: "設定", href: "/settings", icon: Settings },
]

interface AppSidebarProps {
  currentProject?: string
  onProjectChange?: (projectId: string) => void
}

export function AppSidebar({ currentProject = "1", onProjectChange }: AppSidebarProps) {
  const pathname = usePathname()
  const selectedProject = projects.find((p) => p.id === currentProject) || projects[0]

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground">ProjectLens</span>
      </div>

      {/* Project Switcher */}
      <div className="border-b border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-left transition-colors hover:bg-muted border border-border">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {selectedProject.name}
                </span>
                <span className="text-xs text-muted-foreground">{selectedProject.status}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onProjectChange?.(project.id)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.status}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* AI Status */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-primary/10 border border-primary/15 px-3 py-2.5">
          <div className="flex h-2 w-2 items-center justify-center relative">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">AI分析: アクティブ</span>
        </div>
      </div>
    </aside>
  )
}
