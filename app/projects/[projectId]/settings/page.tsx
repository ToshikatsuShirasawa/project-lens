'use client'

import { use, useState } from 'react'
import { ProjectShell } from '@/components/layout/project-shell'
import { ProjectSettingsPanel } from '@/components/settings/project-settings-panel'
import { MemberSettingsPanel } from '@/components/settings/member-settings-panel'
import { IntegrationSettingsPanel } from '@/components/settings/integration-settings-panel'
import { AiSettingsPanel } from '@/components/settings/ai-settings-panel'
import { Settings, Users, Plug, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'general', label: '基本設定', icon: Settings },
  { id: 'members', label: 'メンバー管理', icon: Users },
  { id: 'integrations', label: '連携設定', icon: Plug },
  { id: 'ai', label: 'AI設定', icon: Brain },
] as const

type TabId = (typeof TABS)[number]['id']

interface SettingsPageProps {
  params: Promise<{ projectId: string }>
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = use(params)
  const [activeTab, setActiveTab] = useState<TabId>('general')

  return (
    <ProjectShell projectId={projectId} redirectToNewUrl>
      <div className="p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">設定</h1>
            <p className="text-sm text-muted-foreground mt-1">プロジェクトの設定を管理します</p>
          </div>

          {/* タブナビゲーション */}
          <div className="flex gap-1 border-b border-border">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          {activeTab === 'general' && <ProjectSettingsPanel projectId={projectId} />}
          {activeTab === 'members' && <MemberSettingsPanel projectId={projectId} />}
          {activeTab === 'integrations' && <IntegrationSettingsPanel />}
          {activeTab === 'ai' && <AiSettingsPanel />}
        </div>
      </div>
    </ProjectShell>
  )
}
