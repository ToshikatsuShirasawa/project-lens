import type { WorkReport } from '@/lib/types'

export const mockReports: WorkReport[] = [
  {
    id: 'r1',
    completed: '商品詳細ページのレスポンシブ対応を完了。画像ギャラリーのスワイプ機能も追加しました。',
    inProgress: 'カート機能のセッション管理を実装中。明日の午前中には完了予定。',
    blockers: '決済APIの仕様書がまだ届いていないため、連携部分の実装が進められません。',
    nextActions: '明日は決済APIの代替案としてStripeの調査を進めます。',
    submittedAt: '2026-04-20T18:00:00',
    submittedBy: '鈴木花子',
  },
  {
    id: 'r2',
    completed: '商品APIのパフォーマンス改善を実施。レスポンスタイムを40%短縮。',
    inProgress: '在庫管理APIの設計レビュー中。',
    blockers: '',
    nextActions: '在庫管理APIの実装に着手。',
    submittedAt: '2026-04-20T17:30:00',
    submittedBy: '佐藤次郎',
  },
]
