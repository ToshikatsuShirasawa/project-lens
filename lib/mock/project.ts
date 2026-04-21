import type { Project } from '@/lib/types'

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'ECサイトリニューアル',
    description: '既存ECサイトのフルリニューアルプロジェクト。新しいデザインシステムとモダンな技術スタックへの移行。',
    status: 'active',
    channels: ['ec-renewal', 'dev-team'],
    lastUpdated: '5分前',
    createdAt: '2026-01-15',
    members: [
      { id: '1', name: '田中太郎', email: 'tanaka@example.com', role: 'pm', status: 'active' },
      { id: '2', name: '鈴木花子', email: 'suzuki@example.com', role: 'member', status: 'active' },
      { id: '3', name: '佐藤次郎', email: 'sato@example.com', role: 'member', status: 'active' },
      { id: '4', name: '高橋美咲', email: 'takahashi@example.com', role: 'member', status: 'active' },
      { id: '5', name: '伊藤健一', email: 'ito@example.com', role: 'member', status: 'invited' },
      { id: '6', name: '山田優子', email: 'yamada@example.com', role: 'member', status: 'active' },
    ],
  },
  {
    id: '2',
    name: 'モバイルアプリ開発',
    description: 'スマートフォン向けネイティブアプリの新規開発。',
    status: 'active',
    channels: ['mobile-dev'],
    lastUpdated: '2時間前',
    createdAt: '2026-02-01',
    members: [
      { id: '1', name: '田中太郎', email: 'tanaka@example.com', role: 'pm', status: 'active' },
      { id: '7', name: '小林一郎', email: 'kobayashi@example.com', role: 'member', status: 'active' },
    ],
  },
  {
    id: '3',
    name: '社内ツール刷新',
    description: '老朽化した社内ツールの刷新プロジェクト',
    status: 'paused',
    channels: ['internal-tools'],
    lastUpdated: '3日前',
    createdAt: '2025-11-01',
    members: [
      { id: '3', name: '佐藤次郎', email: 'sato@example.com', role: 'pm', status: 'active' },
    ],
  },
]

export function getProject(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id)
}
