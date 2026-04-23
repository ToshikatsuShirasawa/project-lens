import { toast } from '@/hooks/use-toast'

/** 成功トースト（title のみ、または補足の description 付き） */
export function toastSuccess(title: string, description?: string) {
  const d = description?.trim()
  toast({ title, description: d || undefined })
}

/**
 * 制限到達・重複等の**ビジネス上の拒否**（障害ではない想定）。赤い destructive は使わない。
 * 他の上限系（ワークスペース枠、招待枠等）も同系統で出す想定。
 */
export function toastResourceConstraint(title: string, description?: string) {
  const d = description?.trim()
  /** `components/ui/toast.tsx` の `variant: "warning"`（amber 系。destructive とは色で二分化） */
  toast({
    variant: 'warning',
    title,
    description: d || undefined,
  })
}

/** エラートースト（予期せぬ失敗。title 固定 + message を description に） */
export function toastError(message?: string) {
  toast({
    variant: 'destructive',
    title: 'エラーが発生しました',
    description: message?.trim() ? message.trim() : undefined,
  })
}
