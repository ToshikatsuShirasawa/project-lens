import { summarizeCandidateReasons } from '@/lib/ai/candidate-reason-summary'
import type { TaskCandidate } from '@/lib/types'

export type TaskCandidateScoreConfidence = 'high' | 'medium' | 'review'

export type TaskCandidateScoreResult = {
  score: number
  confidenceLevel: TaskCandidateScoreConfidence
  recommendationReason: string
  scoreBreakdown: {
    sourceKey: TaskCandidate['source']
    source: number
    reason: number
    rawReason: number
    assignee: number
    dueDate: number
    actionability: number
    /** actionabilityの判定根拠 */
    actionabilityReason: string
    urgency: number
    /** urgencyの判定根拠 */
    urgencyReason: string
    hasConfirmationSignal: boolean
    hasDecisionSignal: boolean
    /** タイトル・理由・ラベルから見た具体性（-2〜+2） */
    specificity: number
    hasConcreteTaskSignal: boolean
    /** 具体語がなく、抽象語が目立つ（減点条件を満たす）とき true */
    hasAbstractOnlySignal: boolean
    /** specificityの判定根拠 */
    specificityReason: string
    /** extractionStatus による加減算（waiting:-3 / unknown:-2 / other:0） */
    extractionStatusAdjustment: number
  }
  /** summarizeCandidateReasons ベース（ログや調整用） */
  legacyConfidenceLevel: TaskCandidateScoreConfidence
}

export type ComparativeRecommendationResult = {
  recommendationReason: string
  scoreDiffToNext: number | null
  isComparativeRecommendation: boolean
}

// ─── source ──────────────────────────────────────────────────────

/** source 別の基礎点（0-2） */
const SOURCE_WEIGHTS: Record<TaskCandidate['source'], number> = {
  slack: 2,
  meeting: 1,
  memo: 1,
  report: 1,
  ai: 0,
}

// ─── reason labels ────────────────────────────────────────────────

/**
 * チップラベル → スコア加点。
 * ・「決定事項に紐づく」は weight: 1 に抑える（reason 文の "必要" が誤マッチするため）
 * ・「担当候補あり」は 0（actionability 側で評価するため二重計上しない）
 */
const REASON_LABEL_WEIGHTS: Record<string, number> = {
  期限が近い: 2,
  確認依頼あり: 2,
  'Slackメモで確認依頼': 2,
  決定事項に紐づく: 1,
  担当候補あり: 0,
  言及あり: 1,
}

/** reason バケットの上限（インフレ防止） */
const MAX_REASON_SCORE = 2

const REASON_LABEL_GROUPS = {
  confirmation: ['確認依頼あり', 'Slackメモで確認依頼'],
  dueSoon: ['期限が近い'],
  decision: ['決定事項に紐づく'],
  assignee: ['担当候補あり'],
  mention: ['言及あり'],
} as const

// ─── urgency ─────────────────────────────────────────────────────

/**
 * タイトルに含まれていると urgency +2 になるキーワード。
 * ラベルより先に判定し、実際のタスク文言を直接見る。
 */
const URGENCY_TITLE_KEYWORDS: readonly string[] = [
  '必要',
  '早め',
  '至急',
  '急ぎ',
  '本日',
  '明日',
  '今週',
] as const

// ─── specificity ─────────────────────────────────────────────────

/**
 * 単体で出現したとき抽象タスクと見なす語（具体対象物があれば打ち消し）。
 * 「調査」「洗い出し」はとくに具体性が低い。
 */
const ABSTRACT_TASK_KEYWORDS: readonly string[] = [
  '準備',
  '対応',
  '調整',
  '確認',
  '調査',
  '洗い出し',
  '検討',
  '共有',
  '議論',
  '方針',
  '課題',
  'レビュー',
] as const

/**
 * 具体対象物がなくても +1 を与える動詞/名詞。
 * 長い語を先に書き、部分マッチ優先になるように管理する。
 */
const STRONG_CONCRETE_KEYWORDS: readonly string[] = [
  '確認依頼',
  '実装',
  '作成',
  '修正',
  '設定',
  '手配',
  '依頼',
  '更新',
  '追加',
  '連絡',
] as const

/** API/ファイル/画面名/数値/日付など具体的対象物のパターン → +2 */
const CONCRETE_OBJECT_PATTERNS: readonly RegExp[] = [
  /\/[a-zA-Z][\w/\-]+/, // API パス (/api/users など)
  /\bAPI\b/i, // API キーワード
  /\w+\.(ts|tsx|js|json|sql|css|html)\b/, // ファイル名
  /[぀-鿿]+画面|[぀-鿿]+ページ|[぀-鿿]+フォーム/, // 画面名
  /[Ee]rror|エラー|例外/, // エラー文
  /\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}月\d{1,2}日/, // 日付
  /[぀-鿿\w]+さん/, // 担当者名
  /\d+件|\d+%|\d+万/, // 数値（件数・割合・金額）
] as const

// ─── helpers ─────────────────────────────────────────────────────

const RANK: Record<TaskCandidateScoreConfidence, number> = {
  review: 0,
  medium: 1,
  high: 2,
}

function hasNonEmpty(s: string | undefined): boolean {
  return Boolean(s?.trim())
}

function collectReasonLabels(candidate: TaskCandidate): Set<string> {
  const summary = summarizeCandidateReasons(candidate, { isTopCandidate: false, maxChips: 8 })
  return new Set(summary.chips.map((chip) => chip.label))
}

type CandidateSignals = {
  hasConfirmationSignal: boolean
  hasDecisionSignal: boolean
  hasDueDate: boolean
  hasAssignee: boolean
}

function collectCandidateSignals(candidate: TaskCandidate, labels: Set<string>): CandidateSignals {
  const hasConfirmationSignal =
    labels.has('確認依頼あり') ||
    labels.has('Slackメモで確認依頼') ||
    /確認依頼|お願いします|対応お願い/.test(candidate.reason ?? '')
  const hasDecisionSignal = labels.has('決定事項に紐づく')
  const hasDueDate = hasNonEmpty(candidate.suggestedDueDate)
  const hasAssignee = hasNonEmpty(candidate.suggestedAssignee)
  return { hasConfirmationSignal, hasDecisionSignal, hasDueDate, hasAssignee }
}

// ─── score buckets ───────────────────────────────────────────────

function scoreSourceBucket(candidate: TaskCandidate): number {
  return SOURCE_WEIGHTS[candidate.source] ?? 0
}

function scoreReasonFromLabels(labels: Set<string>): number {
  let total = 0
  for (const groupLabels of Object.values(REASON_LABEL_GROUPS)) {
    const matchedLabel = groupLabels.find((label) => labels.has(label))
    if (!matchedLabel) continue
    const w = REASON_LABEL_WEIGHTS[matchedLabel]
    if (!w) continue
    total += w
  }
  return total
}

function scoreReasonBucket(labels: Set<string>): { rawReason: number; reason: number } {
  const rawReason = scoreReasonFromLabels(labels)
  const reason = Math.min(rawReason, MAX_REASON_SCORE)
  return { rawReason, reason }
}

/**
 * urgency (0 or 2)
 *
 * ラベルより先にタイトルを直接分析する。
 * report 由来候補の reason 文（ボイラープレート）に依存しないようにするため。
 */
function scoreUrgencyBucket(
  candidate: TaskCandidate,
  labels: Set<string>
): { urgency: number; urgencyReason: string } {
  if (labels.has('期限が近い')) {
    return { urgency: 2, urgencyReason: 'label:期限が近い' }
  }
  const titleText = candidate.title ?? ''
  for (const kw of URGENCY_TITLE_KEYWORDS) {
    if (titleText.includes(kw)) {
      return { urgency: 2, urgencyReason: `title:${kw}` }
    }
  }
  return { urgency: 0, urgencyReason: 'none(0)' }
}

/**
 * actionability (-2 to +2)
 *
 * - assignee + dueDate 両方あり → すぐ実行可能 (+2)
 * - どちらか一方のみ           → 一定の行動可能性 (+1)
 * - extractionStatus = waiting → 相手依存で実行不可 (-2)
 * - それ以外                   → 中立 (0)
 */
function scoreActionabilityBucket(
  candidate: TaskCandidate,
  signals: CandidateSignals
): { actionability: number; actionabilityReason: string } {
  if (signals.hasAssignee && signals.hasDueDate) {
    return { actionability: 2, actionabilityReason: 'assignee+dueDate(+2)' }
  }
  if (signals.hasAssignee) {
    return { actionability: 1, actionabilityReason: 'assignee(+1)' }
  }
  if (signals.hasDueDate) {
    return { actionability: 1, actionabilityReason: 'dueDate(+1)' }
  }
  if (candidate.extractionStatus === 'waiting') {
    return { actionability: -2, actionabilityReason: 'waiting(-2)' }
  }
  return { actionability: 0, actionabilityReason: 'none(0)' }
}

/**
 * extractionStatus による加減算。actionability とは独立した調整値。
 * waiting: 追跡すべき有効なタスク（フォローアップ目的）→ ペナルティなし
 * unknown: 判定不明 (-2)
 */
function getExtractionStatusAdjustment(status: TaskCandidate['extractionStatus']): number {
  if (status === 'waiting') return 0
  if (status === 'unknown') return -2
  return 0
}

function buildSpecificityHaystack(candidate: TaskCandidate, labels: Set<string>): string {
  const labelText = [...labels].join(' ')
  return `${candidate.title ?? ''} ${candidate.reason ?? ''} ${labelText}`
}

function hasConcreteObjectPattern(haystack: string): boolean {
  return CONCRETE_OBJECT_PATTERNS.some((p) => p.test(haystack))
}

function hasStrongConcreteKeyword(haystack: string): boolean {
  return STRONG_CONCRETE_KEYWORDS.some((kw) => haystack.includes(kw))
}

function hasAbstractTaskKeyword(haystack: string): boolean {
  return ABSTRACT_TASK_KEYWORDS.some((kw) => haystack.includes(kw))
}

/**
 * specificity (-2 to +2)
 *
 * 優先順位:
 *   1. CONCRETE_OBJECT_PATTERNS → +2
 *   2. STRONG_CONCRETE_KEYWORDS → +1
 *   3. ABSTRACT_TASK_KEYWORDS のみ（確認依頼シグナルなし）→ -2
 *   4. それ以外 → 0
 */
export function scoreSpecificityBucket(
  candidate: TaskCandidate,
  labels: Set<string>,
  _sourceKey: TaskCandidate['source']
): { specificity: number; hasConcreteTaskSignal: boolean; hasAbstractOnlySignal: boolean; specificityReason: string } {
  void _sourceKey
  const haystack = buildSpecificityHaystack(candidate, labels)
  const hasConfirmationSignal =
    labels.has('確認依頼あり') ||
    labels.has('Slackメモで確認依頼') ||
    /確認依頼|お願いします|対応お願い/.test(candidate.reason ?? '')

  const concreteObject = hasConcreteObjectPattern(haystack)
  const strongConcrete = hasStrongConcreteKeyword(haystack)
  const abstractOnly = hasAbstractTaskKeyword(haystack) && !hasConfirmationSignal

  let specificity = 0
  let specificityReason = 'neutral(0)'

  if (concreteObject) {
    specificity = 2
    specificityReason = 'concrete-object(+2)'
  } else if (strongConcrete) {
    specificity = 1
    specificityReason = 'strong-concrete(+1)'
  } else if (abstractOnly) {
    specificity = -2
    specificityReason = 'abstract-only(-2)'
  }

  specificity = Math.max(-2, Math.min(2, specificity))

  return {
    specificity,
    hasConcreteTaskSignal: concreteObject || strongConcrete,
    hasAbstractOnlySignal: abstractOnly && !concreteObject,
    specificityReason,
  }
}

// ─── confidence / recommendation ─────────────────────────────────

/**
 * score 0-10 ベースの信頼度。
 * high: ≥ 7 / medium: ≥ 4 / review: < 4
 */
function confidenceFromScore(score: number): TaskCandidateScoreConfidence {
  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'review'
}

function mergeConfidenceWithLegacy(
  fromScore: TaskCandidateScoreConfidence,
  legacy: TaskCandidateScoreConfidence
): TaskCandidateScoreConfidence {
  const d = RANK[fromScore] - RANK[legacy]
  if (d >= 2 || d <= -2) return 'medium'
  return fromScore
}

function buildRecommendationReason(candidate: TaskCandidate, labels: Set<string>): string {
  const hasDeadline = labels.has('期限が近い')
  const signals = collectCandidateSignals(candidate, labels)
  const hasConfirm = signals.hasConfirmationSignal
  const hasDecision = labels.has('決定事項に紐づく')

  if (hasDeadline && hasConfirm) return '期限が近く、確認依頼もあるため候補化しています'
  if (candidate.source === 'slack' && hasConfirm) return '確認依頼があるため候補化しています'
  if (hasDecision) return '決定事項に紐づくため候補化しています'
  if (candidate.source === 'slack') return 'Slackメモの内容から候補化しています'
  if (candidate.source === 'meeting') return '議事録の内容に基づき候補化しています'
  if (candidate.source === 'memo') return 'メモの内容に基づき候補化しています'
  if (candidate.source === 'report') return '作業報告の内容に基づき候補化しています'
  return '複数のシグナルから候補化しています'
}

function buildPriorityEvidenceText(score: TaskCandidateScoreResult): string {
  const parts: string[] = []
  if (score.scoreBreakdown.urgency >= 1) parts.push('期限が近い')
  if (score.scoreBreakdown.hasConfirmationSignal) parts.push('確認依頼がある')
  if (score.scoreBreakdown.actionability >= 2) parts.push('担当や期限が見えている')
  if (score.scoreBreakdown.hasDecisionSignal) parts.push('決定事項に紐づく')
  if (score.scoreBreakdown.hasConcreteTaskSignal) parts.push('具体的な作業内容が見えている')
  if (score.scoreBreakdown.sourceKey === 'slack' && score.scoreBreakdown.source >= 2) {
    parts.push('Slackメモ由来の明確な依頼')
  }
  if (parts.length === 0) return '根拠が比較的そろっている'
  return parts.slice(0, 2).join('、')
}

// ─── main ────────────────────────────────────────────────────────

/**
 * スコア計算。
 *
 * formula: source + urgency + specificity + actionability + extractionStatusAdjustment + reason
 * max: 2 + 2 + 2 + 2 + 0 + 2 = 10
 * min: 0 (clamp)
 */
export function scoreTaskCandidate(candidate: TaskCandidate): TaskCandidateScoreResult {
  const labels = collectReasonLabels(candidate)
  const legacy = summarizeCandidateReasons(candidate, { isTopCandidate: false, maxChips: 4 }).confidenceLevel
  const signals = collectCandidateSignals(candidate, labels)

  const source = scoreSourceBucket(candidate)
  const { rawReason, reason } = scoreReasonBucket(labels)
  const assignee = signals.hasAssignee ? 1 : 0
  const dueDate = signals.hasDueDate ? 1 : 0
  const { urgency, urgencyReason } = scoreUrgencyBucket(candidate, labels)
  const { actionability, actionabilityReason } = scoreActionabilityBucket(candidate, signals)
  const { specificity, hasConcreteTaskSignal, hasAbstractOnlySignal, specificityReason } = scoreSpecificityBucket(
    candidate,
    labels,
    candidate.source
  )
  const extractionStatusAdjustment = getExtractionStatusAdjustment(candidate.extractionStatus)

  const rawScore = source + urgency + specificity + actionability + extractionStatusAdjustment + reason
  // 0〜10 に正規化（NULL・負値・10超を排除）
  const score = Math.max(0, Math.min(10, rawScore))

  const rawTier = confidenceFromScore(score)
  const confidenceLevel = mergeConfidenceWithLegacy(rawTier, legacy)
  const recommendationReason = buildRecommendationReason(candidate, labels)

  return {
    score,
    confidenceLevel,
    recommendationReason,
    scoreBreakdown: {
      sourceKey: candidate.source,
      source,
      reason,
      rawReason,
      assignee,
      dueDate,
      actionability,
      actionabilityReason,
      urgency,
      urgencyReason,
      hasConfirmationSignal: signals.hasConfirmationSignal,
      hasDecisionSignal: signals.hasDecisionSignal,
      specificity,
      hasConcreteTaskSignal,
      hasAbstractOnlySignal,
      specificityReason,
      extractionStatusAdjustment,
    },
    legacyConfidenceLevel: legacy,
  }
}

export function buildComparativeRecommendationReason(candidates: TaskCandidate[]): ComparativeRecommendationResult {
  if (candidates.length === 0) {
    return {
      recommendationReason: '根拠があるため、まず確認したい候補です',
      scoreDiffToNext: null,
      isComparativeRecommendation: false,
    }
  }

  const top = scoreTaskCandidate(candidates[0])
  const next = candidates.length >= 2 ? scoreTaskCandidate(candidates[1]) : null
  const diff = next ? top.score - next.score : null
  const evidence = buildPriorityEvidenceText(top)

  if (diff === null) {
    return {
      recommendationReason: `${evidence}ため、まず確認したい候補です`,
      scoreDiffToNext: null,
      isComparativeRecommendation: false,
    }
  }
  if (diff >= 2) {
    return {
      recommendationReason: `他の候補よりも${evidence}ため、優先しています`,
      scoreDiffToNext: diff,
      isComparativeRecommendation: true,
    }
  }
  if (diff <= 0) {
    return {
      recommendationReason: `他の候補と同程度ですが、${evidence}ため先に確認したい候補です`,
      scoreDiffToNext: diff,
      isComparativeRecommendation: true,
    }
  }
  return {
    recommendationReason: `他の候補と近いスコアですが、${evidence}ため先に確認したい候補です`,
    scoreDiffToNext: diff,
    isComparativeRecommendation: true,
  }
}

/**
 * score 降順。同点は元配列の順序を維持。
 * `held: true`（あとで）の候補は末尾にまとめる。
 */
export function sortTaskCandidatesByScore(candidates: TaskCandidate[]): TaskCandidate[] {
  const decorated = candidates.map((c, originalIndex) => ({
    c,
    originalIndex,
    held: Boolean(c.held),
    score: scoreTaskCandidate(c).score,
  }))
  decorated.sort((a, b) => {
    if (a.held !== b.held) return a.held ? 1 : -1
    if (!a.held && !b.held && b.score !== a.score) return b.score - a.score
    return a.originalIndex - b.originalIndex
  })
  return decorated.map((row) => row.c)
}
