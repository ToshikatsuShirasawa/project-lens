import { toast } from '@/hooks/use-toast'

/** 成功トースト（最小: title のみ） */
export function toastSuccess(title: string) {
  toast({ title })
}

/** エラートースト（title 固定 + API メッセージを description に） */
export function toastError(message?: string) {
  toast({
    variant: 'destructive',
    title: 'エラーが発生しました',
    description: message?.trim() ? message.trim() : undefined,
  })
}
