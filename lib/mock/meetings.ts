import type { Meeting } from '@/lib/types'

export const mockUpcomingMeetings: Meeting[] = [
  {
    id: 'u1',
    title: '週次定例ミーティング',
    date: '4/21（月）',
    time: '10:00 - 11:00',
    participants: [{ name: '田中太郎' }, { name: '鈴木花子' }, { name: '佐藤次郎' }],
    hasAgenda: true,
  },
  {
    id: 'u2',
    title: '決済機能レビュー会',
    date: '4/22（火）',
    time: '14:00 - 15:00',
    participants: [{ name: '高橋美咲' }, { name: '田中太郎' }],
    hasAgenda: true,
  },
  {
    id: 'u3',
    title: 'スプリントレトロスペクティブ',
    date: '4/25（金）',
    time: '16:00 - 17:00',
    participants: [
      { name: '田中太郎' },
      { name: '鈴木花子' },
      { name: '佐藤次郎' },
      { name: '高橋美咲' },
    ],
    hasAgenda: false,
  },
]

export const mockPastMeetings: Meeting[] = [
  {
    id: 'p1',
    title: '決済API仕様確認ミーティング',
    date: '4/18（金）',
    time: '15:00 - 16:00',
    participants: [{ name: '田中太郎' }, { name: '高橋美咲' }],
    isPast: true,
    agenda: [
      '決済APIの現状共有',
      '仕様書の到着遅延について',
      '代替案の検討',
      '次のアクション確認',
    ],
    notes:
      '外部ベンダーからの仕様書は来週月曜日に届く予定。それまでの間、代替案としてStripeの利用も検討することに決定。',
    decisions: [
      '仕様書到着まではStripeをバックアップとして調査する',
      '月曜日に仕様書が届かない場合はエスカレーション',
    ],
    unresolvedPoints: [
      { text: 'テスト環境でのAPI接続テスト方法', priority: 'high', deadline: '次回MTGまで' },
      { text: '本番環境のセキュリティ要件の最終確認', priority: 'medium', deadline: '4/25まで' },
      { text: 'エラー時のフォールバック仕様', priority: 'low', deadline: '未定' },
    ],
    followUpTasks: [
      { id: 't1', title: 'Stripe APIの調査', assignee: '高橋美咲', dueDate: '4/21', status: 'kanban' },
      { id: 't2', title: 'ベンダーへのフォローアップ連絡', assignee: '田中太郎', dueDate: '4/21', status: 'kanban' },
      { id: 't3', title: 'セキュリティ要件の洗い出し', assignee: '佐藤次郎', dueDate: '4/22', status: 'candidate' },
      { id: 't4', title: 'テスト環境の準備', assignee: undefined, dueDate: '4/23', status: 'pending' },
    ],
  },
]
