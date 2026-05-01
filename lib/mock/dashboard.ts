import type {
  DecisionCard,
  ProjectStatus,
  IssueRiskItem,
  MissingInfoItem,
  TaskCandidate,
  TimelineEvent,
} from '@/lib/types'

export const mockDecisionCard: DecisionCard = {
  id: 'dc-1',
  situation: '決済API仕様書が3日遅延中',
  context:
    '外部ベンダーからの回答待ちが続いています。メールでの催促は2回実施済みですが、返答がありません。このままではリリースに影響が出る可能性があります。',
  urgency: 'critical',
  delayDays: 3,
  daysUntilDeadline: 5,
  impactTimeline: [
    { days: 3, description: 'リリース延期確定', severity: 'critical' },
    { days: 5, description: 'テスト工程に影響', severity: 'critical' },
    { days: 7, description: '顧客への遅延連絡が必要', severity: 'warning' },
  ],
  actionTimeline: [
    { timing: '今日', action: 'ベンダーに電話連絡', outcome: '状況と納期を確認' },
    { timing: '明日', action: '納期確定', outcome: 'プロジェクト計画を更新' },
    { timing: '週内', action: '開発再開', outcome: '遅延を回避' },
  ],
  aiDecision: '本日中にベンダーへ電話連絡する',
  aiReason:
    'メールでの催促は2回失敗しており、直接連絡が必要です。電話連絡により、即日で状況確認と具体的な納期を取得できる可能性が高いです。',
  alternatives: [
    { label: 'Stripeに切り替え', effort: 'medium', impact: 'medium', href: '/projects/1/kanban' },
    { label: 'リリース延期', effort: 'low', impact: 'high', href: '/projects/1/kanban' },
    { label: '上長にエスカレーション', effort: 'low', impact: 'medium', href: '/projects/1/kanban' },
  ],
  primaryAction: {
    label: 'ベンダーに電話連絡する',
    href: '/projects/1/kanban',
    purpose: '遅延確定を防ぐ',
    outcome: '具体的な納期回答を取得し、プロジェクト計画を更新',
    expectedTimeline: '本日中に状況確定見込み',
  },
}

export const mockProjectStatus: ProjectStatus = {
  summary:
    'フロントエンド開発は順調に進行中。決済API待ちの影響で一部タスクがブロック状態ですが、並行可能な作業は予定通り進んでいます。',
  progress: 68,
  bottleneck: '決済API待ちの影響で、テスト計画の詳細策定がブロックされています。',
  bottleneckSource: 'ai',
  bottleneckDelayDays: 2,
  nextAction: 'ブロックされていない作業を優先的に完了させる',
  overallUrgency: 'warning',
  daysUntilMilestone: 12,
  aiRecommendation: '決済API以外の作業を先行完了させましょう',
  aiRecommendationReason: '7件のタスクがAPI待ちなしで完了可能です',
  actions: [
    { label: '並行可能タスクを確認', href: '/projects/1/kanban', isRecommended: true },
    { label: '進捗を報告', href: '/projects/1/reports' },
  ],
}

export const mockIssues: IssueRiskItem[] = [
  {
    id: '2',
    title: 'テスト環境の構築遅れ',
    description: 'インフラチームのリソース不足により、テスト環境の準備が遅れる可能性があります',
    severity: 'medium',
    source: 'report',
    urgency: 'warning',
    daysUntilDeadline: 5,
    aiRecommendation: 'インフラチームの優先度調整を依頼',
  },
  {
    id: '3',
    title: 'モバイル対応の工数増加リスク',
    description: '想定以上のブレークポイント対応が必要になる可能性をAIが検出しました',
    severity: 'low',
    source: 'ai',
    urgency: 'normal',
  },
  {
    id: '4',
    title: 'ポイント連携の仕様不明確',
    description: '既存ポイントシステムとの連携方法が未確定のまま開発が進んでいます',
    severity: 'medium',
    source: 'meeting',
    urgency: 'warning',
    daysUntilDeadline: 10,
    aiRecommendation: '今週中に仕様確認MTGを設定',
  },
]

export const mockMissingItems: MissingInfoItem[] = [
  {
    id: '1',
    type: 'assignee',
    title: 'セキュリティレビューの担当者',
    context: '決済機能のセキュリティ監査を担当する人が未定',
    source: 'ai',
  },
  {
    id: '2',
    type: 'deadline',
    title: 'ユーザー受け入れテストの開始日',
    context: 'テスト計画書に記載がありません',
    source: 'report',
  },
  {
    id: '3',
    type: 'decision',
    title: 'エラーハンドリングの方針',
    context: '決済エラー時のユーザー導線が未決定',
    source: 'meeting',
  },
  {
    id: '4',
    type: 'requirement',
    title: 'ポイント連携の詳細仕様',
    context: '既存ポイントシステムとの連携方法が不明確',
    source: 'slack',
  },
]

export const mockTaskCandidates: TaskCandidate[] = [
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
  {
    id: 'c4',
    title: 'エラーハンドリングの方針決め',
    reason: '複数の議事録で「エラー処理」が未解決事項として残っている',
    source: 'meeting',
  },
]

export const mockActivities: TimelineEvent[] = [
  {
    id: '1',
    type: 'report',
    title: '作業報告が追加されました',
    description: 'フロントエンド: 商品一覧ページのレスポンシブ対応完了',
    user: { name: '鈴木花子' },
    timestamp: '10分前',
  },
  {
    id: '2',
    type: 'ai',
    title: '新しい課題を検出しました',
    description: 'Slackの会話から決済API遅延に関するリスクを特定',
    timestamp: '30分前',
  },
  {
    id: '3',
    type: 'kanban',
    title: 'カンバンカードが更新されました',
    description: '「商品詳細ページ」が「レビュー中」に移動',
    user: { name: '田中太郎' },
    timestamp: '1時間前',
  },
  {
    id: '4',
    type: 'slack',
    title: 'Slack同期が完了しました',
    description: '#ec-renewal から15件の新しいメッセージを分析',
    timestamp: '2時間前',
  },
  {
    id: '5',
    type: 'report',
    title: '作業報告が追加されました',
    description: 'バックエンド: 商品APIのパフォーマンス改善',
    user: { name: '佐藤次郎' },
    timestamp: '3時間前',
  },
]
