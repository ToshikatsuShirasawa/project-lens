import { isProjectCountLimitResponse, MSG_PROJECT_COUNT_LIMIT_REACHED } from '@/lib/organization/project-limit'

/**
 * フロントが「制限到達（正常な拒否）」と「障害」を分けて見せるための入口。
 * 新しい上限 API では `isXxxResponse` + 分岐をここに集約しやすい。
 */

const PROJECT_CREATE_LIMIT_TOAST = {
  title: 'プロジェクトの上限に達しています',
  description: 'このワークスペースではこれ以上プロジェクトを作成できません',
} as const

export type ProjectCreateRejectionResult =
  | {
      kind: 'resource_limit'
      /** モーダル内: API 文言をそのまま（`MSG_PROJECT_COUNT_LIMIT_REACHED` と一致） */
      inlineMessage: string
      toastTitle: string
      toastDescription: string
    }
  | {
      kind: 'failure'
      message: string
    }

/**
 * `POST /api/projects` 失応答を UI 用に分類。409 は必ずしも制限ではないが、
 * 現状は `MSG_PROJECT_COUNT_LIMIT_REACHED` で判定（将来 `body.code` を併用可）
 */
export function userFacingRejectionForProjectCreate(
  status: number,
  apiMessage: string | undefined
): ProjectCreateRejectionResult {
  const trimmed = apiMessage?.trim() ?? ''
  if (isProjectCountLimitResponse(status, trimmed)) {
    return {
      kind: 'resource_limit',
      inlineMessage: trimmed || MSG_PROJECT_COUNT_LIMIT_REACHED,
      toastTitle: PROJECT_CREATE_LIMIT_TOAST.title,
      toastDescription: PROJECT_CREATE_LIMIT_TOAST.description,
    }
  }
  const fallback = trimmed || (status ? `通信に失敗しました（${status}）` : 'プロジェクトの作成に失敗しました')
  return { kind: 'failure', message: fallback }
}
