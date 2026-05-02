import { ProjectShell } from '@/components/layout/project-shell'
import { SlackIntegrationPanel } from '@/components/slack/slack-integration-panel'

interface SlackPageProps {
  params: Promise<{ organizationId: string; projectId: string }>
}

export default async function SlackPage({ params }: SlackPageProps) {
  const { organizationId, projectId } = await params

  return (
    <ProjectShell projectId={projectId} organizationId={organizationId}>
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Slack連携</h1>
            <p className="text-sm text-muted-foreground mt-1">
              自分が参加しているSlackチャンネルから、AI候補の元になる会話を取り込みます。
              対象チャンネルと期間を選択して、必要な会話だけを候補抽出に使います。
            </p>
          </div>
          <SlackIntegrationPanel projectId={projectId} organizationId={organizationId} />
        </div>
      </div>
    </ProjectShell>
  )
}
