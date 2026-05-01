import type { TaskCandidate } from '@/lib/types'

type ReasonStrength = 'strong' | 'support'
type ConfidenceLevel = 'high' | 'medium' | 'review'

export interface CandidateReasonChip {
  label: string
  weight: number
  strength: ReasonStrength
}

export interface CandidateReasonSummary {
  chips: CandidateReasonChip[]
  recommendationReason: string | null
  confidenceLevel: ConfidenceLevel
  supportText: string
}

interface Rule {
  pattern: RegExp
  label: string
  weight: number
}

const reasonRules: Rule[] = [
  { pattern: /(期限|締切|至急|急ぎ|本日|明日|今週)/i, label: '期限が近い', weight: 95 },
  { pattern: /(確認依頼|お願いします|対応お願いします|確認が必要|レビューが必要)/i, label: '確認依頼あり', weight: 90 },
  { pattern: /(決定事項|合意|方針|必要)/i, label: '決定事項に紐づく', weight: 84 },
  { pattern: /(ブロッカー|詰まり|進まない|課題|問題)/i, label: '進行阻害の兆候', weight: 82 },
  { pattern: /(言及|発言|スレッド|メンション|会話)/i, label: '言及あり', weight: 78 },
  { pattern: /(議事録|会議|mtg)/i, label: '会議メモ由来', weight: 75 },
  { pattern: /(作業報告|報告|週報)/i, label: '作業報告由来', weight: 72 },
  { pattern: /(検出|抽出|ai)/i, label: 'AI検出シグナル', weight: 60 },
]

const sourceReasonMap: Record<TaskCandidate['source'], CandidateReasonChip> = {
  slack: { label: 'Slackメモで確認依頼', weight: 85, strength: 'support' },
  report: { label: '作業報告由来', weight: 70, strength: 'support' },
  meeting: { label: '会議メモ由来', weight: 75, strength: 'support' },
  ai: { label: 'AI検出シグナル', weight: 60, strength: 'support' },
}

function pushUnique(chips: CandidateReasonChip[], next: CandidateReasonChip) {
  if (!chips.some((chip) => chip.label === next.label)) {
    chips.push(next)
  }
}

export function summarizeCandidateReasons(
  candidate: TaskCandidate,
  options?: { isTopCandidate?: boolean; maxChips?: number }
): CandidateReasonSummary {
  const maxChips = options?.maxChips ?? 4
  const chips: CandidateReasonChip[] = []
  const reasonText = candidate.reason ?? ''

  pushUnique(chips, sourceReasonMap[candidate.source])

  for (const rule of reasonRules) {
    if (rule.pattern.test(reasonText)) {
      pushUnique(chips, {
        label: rule.label,
        weight: rule.weight,
        strength: rule.weight >= 85 ? 'strong' : 'support',
      })
    }
  }

  if (candidate.suggestedDueDate) {
    pushUnique(chips, { label: '期限が近い', weight: 92, strength: 'strong' })
  }
  if (!candidate.suggestedAssignee) {
    pushUnique(chips, { label: '担当未設定', weight: 80, strength: 'support' })
  } else {
    pushUnique(chips, { label: '担当候補あり', weight: 66, strength: 'support' })
  }

  chips.sort((a, b) => b.weight - a.weight)
  if (chips[0]) chips[0].strength = 'strong'

  const selectedChips = chips.slice(0, maxChips)
  const topWeight = selectedChips[0]?.weight ?? 0
  const secondWeight = selectedChips[1]?.weight ?? 0

  const confidenceLevel: ConfidenceLevel =
    topWeight >= 90 || topWeight + secondWeight >= 170
      ? 'high'
      : topWeight >= 75
        ? 'medium'
        : 'review'

  const recommendationReason =
    options?.isTopCandidate && selectedChips[0]
      ? `${selectedChips[0].label}のため優先度が高い候補です`
      : null

  return {
    chips: selectedChips,
    recommendationReason,
    confidenceLevel,
    supportText: reasonText,
  }
}
