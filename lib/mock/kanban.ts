import type { KanbanTask, TaskCandidate } from '@/lib/types'

export const KANBAN_COLUMNS = [
  { id: 'backlog', title: 'バックログ' },
  { id: 'inprogress', title: '進行中' },
  { id: 'blocked', title: 'ブロック' },
  { id: 'review', title: 'レビュー' },
  { id: 'done', title: '完了' },
] as const

export const mockKanbanCards: Record<string, KanbanTask[]> = {
  backlog: [
    {
      id: '1',
      title: 'お気に入り機能の実装',
      description: 'ユーザーが商品をお気に入りに追加できる機能',
      assignee: { name: '田中太郎' },
      dueDate: '4/25',
    },
    {
      id: '2',
      title: 'レビュー投稿機能',
      description: '購入者が商品レビューを投稿できる機能を追加',
      assignee: { name: '伊藤健一' },
      dueDate: '4/28',
      aiOrigin: 'slack',
    },
  ],
  inprogress: [
    {
      id: '3',
      title: '商品詳細ページ',
      description: '商品画像ギャラリーと詳細情報の表示',
      assignee: { name: '鈴木花子' },
      dueDate: '4/22',
    },
    {
      id: '4',
      title: 'カート機能の改善',
      description: 'カートの永続化とセッション管理',
      assignee: { name: '佐藤次郎' },
    },
  ],
  blocked: [
    {
      id: '5',
      title: '決済API連携',
      description: '外部決済サービスとの連携実装（仕様書待ち）',
      assignee: { name: '高橋美咲' },
    },
  ],
  review: [
    {
      id: '6',
      title: '商品一覧ページ',
      description: 'フィルタリングとソート機能付きの商品一覧',
      assignee: { name: '鈴木花子' },
      dueDate: '4/20',
    },
  ],
  done: [
    {
      id: '7',
      title: 'ユーザー認証',
      description: 'ログイン・サインアップ機能の実装完了',
      assignee: { name: '田中太郎' },
    },
    {
      id: '8',
      title: 'Stripe調査',
      description: '決済APIの代替案としてStripeの調査',
      assignee: { name: '高橋美咲' },
      aiOrigin: 'meeting',
    },
  ],
}

export const mockKanbanCandidates: TaskCandidate[] = [
  {
    id: 'c1',
    title: 'API仕様書の確認依頼',
    reason: 'Slackメモで「仕様書の確認をお願いします」という発言を検出',
    source: 'slack',
    suggestedAssignee: '高橋美咲',
    suggestedDueDate: '4/22',
  },
  {
    id: 'c2',
    title: 'テスト環境の準備',
    reason: '作業報告に「テスト環境が必要」と記載あり',
    source: 'report',
    suggestedAssignee: '佐藤次郎',
  },
  {
    id: 'c3',
    title: 'セキュリティレビューの手配',
    reason: '議事録から「セキュリティ確認が必要」という決定事項を抽出',
    source: 'meeting',
    suggestedDueDate: '4/25',
  },
]
