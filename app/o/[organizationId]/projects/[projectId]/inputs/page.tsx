import { ProjectInputsPanel } from '@/components/inputs/project-inputs-panel'
import { ProjectShell } from '@/components/layout/project-shell'

interface InputsPageProps {
  params: Promise<{ organizationId: string; projectId: string }>
}

export default async function InputsPage({ params }: InputsPageProps) {
  const { organizationId, projectId } = await params

  return (
    <ProjectShell projectId={projectId} organizationId={organizationId}>
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">議事録・メモ</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI候補の元になる議事録やメモを登録します。
              会議内容や打ち合わせメモを貼り付けると、未確定のタスク候補を抽出します。
            </p>
          </div>
          <ProjectInputsPanel projectId={projectId} />
        </div>
      </div>
    </ProjectShell>
  )
}
