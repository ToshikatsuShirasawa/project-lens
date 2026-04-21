"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { KanbanBoard } from "@/components/kanban/kanban-board"

export default function KanbanPage() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Header */}
        <header className="border-b border-border bg-card px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground">カンバン</h1>
          <p className="text-xs text-muted-foreground">
            確定したタスクを管理 / 右側パネルでAI候補をレビュー
          </p>
        </header>

        {/* Kanban Board with AI Panel */}
        <KanbanBoard />
      </div>
    </div>
  )
}
