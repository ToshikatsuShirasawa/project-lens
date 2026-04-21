"use client"

import { useState } from "react"
import { KanbanColumn } from "./kanban-column"
import { KanbanCardData } from "./kanban-card"
import { AICandidatesPanel } from "./ai-candidates-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Filter, User, Sparkles } from "lucide-react"

// AI Task Candidates - waiting for human review
const initialCandidates = [
  {
    id: "c1",
    title: "API仕様書の確認依頼",
    reason: "Slackで「仕様書の確認をお願いします」という発言を検出",
    source: "slack" as const,
    suggestedAssignee: "高橋美咲",
    suggestedDueDate: "4/22",
  },
  {
    id: "c2",
    title: "テスト環境の準備",
    reason: "作業報告に「テスト環境が必要」と記載あり",
    source: "report" as const,
    suggestedAssignee: "佐藤次郎",
  },
  {
    id: "c3",
    title: "セキュリティレビューの手配",
    reason: "議事録から「セキュリティ確認が必要」という決定事項を抽出",
    source: "meeting" as const,
    suggestedDueDate: "4/25",
  },
]

const initialColumns = [
  { id: "backlog", title: "バックログ" },
  { id: "inprogress", title: "進行中" },
  { id: "blocked", title: "ブロック" },
  { id: "review", title: "レビュー" },
  { id: "done", title: "完了" },
]

// All cards in kanban are confirmed tasks
// Some may have aiOrigin indicating they came from AI suggestions that were reviewed and approved
const initialCards: Record<string, KanbanCardData[]> = {
  backlog: [
    {
      id: "1",
      title: "お気に入り機能の実装",
      description: "ユーザーが商品をお気に入りに追加できる機能",
      assignee: { name: "田中太郎" },
      dueDate: "4/25",
    },
    {
      id: "2",
      title: "レビュー投稿機能",
      description: "購入者が商品レビューを投稿できる機能を追加",
      assignee: { name: "伊藤健一" },
      dueDate: "4/28",
      aiOrigin: "slack", // Originally suggested by AI from Slack, now confirmed
    },
  ],
  inprogress: [
    {
      id: "3",
      title: "商品詳細ページ",
      description: "商品画像ギャラリーと詳細情報の表示",
      assignee: { name: "鈴木花子" },
      dueDate: "4/22",
    },
    {
      id: "4",
      title: "カート機能の改善",
      description: "カートの永続化とセッション管理",
      assignee: { name: "佐藤次郎" },
    },
  ],
  blocked: [
    {
      id: "5",
      title: "決済API連携",
      description: "外部決済サービスとの連携実装（仕様書待ち）",
      assignee: { name: "高橋美咲" },
    },
  ],
  review: [
    {
      id: "6",
      title: "商品一覧ページ",
      description: "フィルタリングとソート機能付きの商品一覧",
      assignee: { name: "鈴木花子" },
      dueDate: "4/20",
    },
  ],
  done: [
    {
      id: "7",
      title: "ユーザー認証",
      description: "ログイン・サインアップ機能の実装完了",
      assignee: { name: "田中太郎" },
    },
    {
      id: "8",
      title: "Stripe調査",
      description: "決済APIの代替案としてStripeの調査",
      assignee: { name: "高橋美咲" },
      aiOrigin: "meeting", // Originally suggested from meeting notes
    },
  ],
}

export function KanbanBoard() {
  const [cards, setCards] = useState(initialCards)
  const [candidates, setCandidates] = useState(initialCandidates)
  const [draggedCard, setDraggedCard] = useState<{
    cardId: string
    sourceColumn: string
  } | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<KanbanCardData | null>(null)
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null)
  const [newCard, setNewCard] = useState({ title: "", description: "" })

  const handleDragStart = (cardId: string, columnId: string) => {
    setDraggedCard({ cardId, sourceColumn: columnId })
  }

  const handleDragOver = (columnId: string) => {
    setDropTargetColumn(columnId)
  }

  const handleDrop = (targetColumn: string) => {
    if (!draggedCard) return

    const { cardId, sourceColumn } = draggedCard

    if (sourceColumn === targetColumn) {
      setDraggedCard(null)
      setDropTargetColumn(null)
      return
    }

    const sourceCards = cards[sourceColumn]
    const cardIndex = sourceCards.findIndex((c) => c.id === cardId)
    const card = sourceCards[cardIndex]

    setCards({
      ...cards,
      [sourceColumn]: sourceCards.filter((c) => c.id !== cardId),
      [targetColumn]: [...cards[targetColumn], card],
    })

    setDraggedCard(null)
    setDropTargetColumn(null)
  }

  const handleAddCard = (columnId: string) => {
    setNewCardColumn(columnId)
    setNewCard({ title: "", description: "" })
    setEditingCard(null)
    setIsDialogOpen(true)
  }

  const handleEditCard = (card: KanbanCardData) => {
    setEditingCard(card)
    setNewCard({ title: card.title, description: card.description || "" })
    setNewCardColumn(null)
    setIsDialogOpen(true)
  }

  const handleSaveCard = () => {
    if (editingCard) {
      // Update existing card
      const newCards = { ...cards }
      for (const col of Object.keys(newCards)) {
        newCards[col] = newCards[col].map((c) =>
          c.id === editingCard.id
            ? { ...c, title: newCard.title, description: newCard.description }
            : c
        )
      }
      setCards(newCards)
    } else if (newCardColumn) {
      // Add new card
      const card: KanbanCardData = {
        id: Date.now().toString(),
        title: newCard.title,
        description: newCard.description,
      }
      setCards({
        ...cards,
        [newCardColumn]: [...cards[newCardColumn], card],
      })
    }
    setIsDialogOpen(false)
    setEditingCard(null)
    setNewCardColumn(null)
  }

  const getFilteredCards = (columnCards: KanbanCardData[]) => {
    return columnCards.filter((card) => {
      if (filterAssignee !== "all" && card.assignee?.name !== filterAssignee) {
        return false
      }
      return true
    })
  }

  const allAssignees = Array.from(
    new Set(
      Object.values(cards)
        .flat()
        .map((c) => c.assignee?.name)
        .filter(Boolean)
    )
  )

  // Handle adding AI candidate to kanban
  const handleAddCandidateToKanban = (candidate: typeof initialCandidates[0]) => {
    const newTask: KanbanCardData = {
      id: `from-ai-${candidate.id}`,
      title: candidate.title,
      assignee: candidate.suggestedAssignee 
        ? { name: candidate.suggestedAssignee }
        : undefined,
      dueDate: candidate.suggestedDueDate,
      aiOrigin: candidate.source,
    }
    setCards({
      ...cards,
      backlog: [...cards.backlog, newTask],
    })
    setCandidates(candidates.filter((c) => c.id !== candidate.id))
  }

  const handleHoldCandidate = (candidateId: string) => {
    // Just track in local state - handled by panel
  }

  const handleDismissCandidate = (candidateId: string) => {
    setCandidates(candidates.filter((c) => c.id !== candidateId))
  }

  const totalConfirmedTasks = Object.values(cards).flat().length

  return (
    <div className="flex h-full">
      {/* Main Kanban Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40">
              <User className="mr-2 h-4 w-4" />
              <SelectValue placeholder="担当者" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての担当者</SelectItem>
              {allAssignees.map((name) => (
                <SelectItem key={name} value={name!}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              確定タスク: {totalConfirmedTasks}件
            </Badge>
            {candidates.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3" />
                候補: {candidates.length}件
              </Badge>
            )}
          </div>
        </div>

      {/* Board */}
        <div className="flex-1 overflow-x-auto p-6 bg-muted/20">
          <div className="flex gap-6 h-full">
          {initialColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              cards={getFilteredCards(cards[column.id])}
              onAddCard={() => handleAddCard(column.id)}
              onEditCard={handleEditCard}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDropTarget={dropTargetColumn === column.id}
            />
          ))}
          </div>
        </div>
      </div>

      {/* AI Candidates Panel */}
      <AICandidatesPanel
        candidates={candidates}
        onAddToKanban={handleAddCandidateToKanban}
        onHold={handleHoldCandidate}
        onDismiss={handleDismissCandidate}
      />

      {/* Card Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "カードを編集" : "新しいカードを追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル</label>
              <Input
                value={newCard.title}
                onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                placeholder="タスクのタイトル"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">説明</label>
              <Textarea
                value={newCard.description}
                onChange={(e) =>
                  setNewCard({ ...newCard, description: e.target.value })
                }
                placeholder="タスクの詳細説明"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveCard} disabled={!newCard.title}>
              {editingCard ? "保存" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
