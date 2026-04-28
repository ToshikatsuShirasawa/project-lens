import type { ExtractionStatus } from '@/lib/types'

export type { ExtractionStatus }

export type ExtractionJudgement = {
  status: ExtractionStatus
  shouldExtract: boolean
  confidence: number
  reasons: string[]
}

// ─── キーワード定義 ───────────────────────────────────────────

const DONE_KEYWORDS: readonly string[] = [
  '完了',
  '対応済み',
  '確認済み',
  '修正済み',
  '作成済み',
  '実施済み',
  '反映済み',
  '送付済み',
  '共有済み',
  'しました',
  '済ませた',
]

/**
 * 明示的なタスク化フレーズ（辞書形・名詞形など）。
 * done より優先してマッチする（節分割後に単独 todo 節として来ることが多いため）。
 */
const TODO_KEYWORDS: readonly string[] = [
  '未対応',
  '要確認',
  '要対応',
  '必要',
  '残っている',
  'これから',
  '次回',
  '明日',
  '週明け',
  'TODO',
  '修正する',
  '確認する',
  '作成する',
  '準備する',
  '調整する',
]

/**
 * 元実装の TASK_CANDIDATE_KEYWORDS に含まれていた短形式ステム。
 * 「修正します」「確認します」など辞書形以外の活用形をカバーするための後方互換キーワード。
 *
 * 優先順位は TODO_KEYWORDS より低く、done より低い（done が同一節にあれば done 優先）。
 * つまり "修正しました" → done、"修正を進める予定" → todo(legacy)。
 */
const LEGACY_TODO_KEYWORDS: readonly string[] = [
  '対応',
  '手配',
  '依頼',
  '課題',
  '確認',
  '修正',
  '準備',
  '調整',
]

const WAITING_KEYWORDS: readonly string[] = [
  '確認待ち',
  '返信待ち',
  'レビュー待ち',
  '依頼済み',
  '先方確認中',
  '回答待ち',
]

const MEMO_KEYWORDS: readonly string[] = ['共有のみ', 'メモ', '参考', '備考', '記録として']

// ─── 節分割 ──────────────────────────────────────────────────

/**
 * 完了形 + 逆接助詞（「しましたが、」など）を仮の文末記号に置換することで、
 * 「done 節 + todo 節」が 1 文に混在するケースを節単位に分割する。
 */
const DONE_CLAUSE_CONNECTOR_RE =
  /(?:しました|済み|完了|対応済|確認済|修正済|送付済|共有済|実施済|反映済|作成済|済ませた)(が、|けど、|けれど、)/g

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function splitReportIntoClauses(text: string): string[] {
  const withSentenceSplits = text.replace(DONE_CLAUSE_CONNECTOR_RE, (match, connector: string) =>
    match.slice(0, match.length - connector.length) + '。',
  )
  return withSentenceSplits
    .split(/[\n。．！？!?]+/)
    .map(normalizeWhitespace)
    .filter(Boolean)
}

// ─── シグナル検出 ─────────────────────────────────────────────

function collectMatches(clause: string, keywords: readonly string[]): string[] {
  return keywords.filter((kw) => clause.includes(kw))
}

/**
 * 短形式ステムが done/waiting キーワードの一部としてマッチしている場合は除外する。
 * 例: "対応済み" の中の "対応" は done の一部なので legacy todo としてカウントしない。
 * 例: "確認待ち" の中の "確認" は waiting の一部なので除外。
 */
function collectLegacyTodoMatches(clause: string): string[] {
  return LEGACY_TODO_KEYWORDS.filter((kw) => {
    if (!clause.includes(kw)) return false
    const absorbedByDone = DONE_KEYWORDS.some((dk) => dk.includes(kw) && clause.includes(dk))
    const absorbedByWaiting = WAITING_KEYWORDS.some((wk) => wk.includes(kw) && clause.includes(wk))
    return !absorbedByDone && !absorbedByWaiting
  })
}

// ─── 判定 ────────────────────────────────────────────────────

/**
 * 優先順位:
 *   memo > waiting > spec-todo > done > legacy-todo > unknown
 *
 * spec-todo（TODO_KEYWORDS）は done より高優先。節分割後の単独 todo 節を取りこぼさないため。
 * legacy-todo（LEGACY_TODO_KEYWORDS の短形式）は done より低優先。
 *   "修正しました" の "修正" が誤って todo に分類されないようにするため。
 */
export function judgeExtractionClause(clause: string): ExtractionJudgement {
  const memoMatches = collectMatches(clause, MEMO_KEYWORDS)
  const waitingMatches = collectMatches(clause, WAITING_KEYWORDS)
  const specTodoMatches = collectMatches(clause, TODO_KEYWORDS)
  const doneMatches = collectMatches(clause, DONE_KEYWORDS)
  const legacyTodoMatches = collectLegacyTodoMatches(clause)

  const reasons: string[] = [
    ...memoMatches.map((k) => `memo: ${k}`),
    ...waitingMatches.map((k) => `waiting: ${k}`),
    ...specTodoMatches.map((k) => `todo: ${k}`),
    ...legacyTodoMatches.map((k) => `todo(legacy): ${k}`),
    ...doneMatches.map((k) => `done: ${k}`),
  ]

  if (memoMatches.length > 0) {
    return { status: 'memo', shouldExtract: false, confidence: 0.9, reasons }
  }
  if (waitingMatches.length > 0) {
    return { status: 'waiting', shouldExtract: true, confidence: 0.8, reasons }
  }
  // spec-todo は done より優先（節分割済みの純粋 todo 節）
  if (specTodoMatches.length > 0) {
    return { status: 'todo', shouldExtract: true, confidence: 0.9, reasons }
  }
  // done は legacy-todo より優先（"修正しました" の "修正" を todo にしない）
  if (doneMatches.length > 0) {
    return { status: 'done', shouldExtract: false, confidence: 0.9, reasons }
  }
  // legacy-todo はここに到達する（= done シグナルなし）
  if (legacyTodoMatches.length > 0) {
    return { status: 'todo', shouldExtract: true, confidence: 0.8, reasons }
  }

  return { status: 'unknown', shouldExtract: false, confidence: 0.5, reasons }
}

export function shouldCreateTaskCandidate(judgement: ExtractionJudgement): boolean {
  return judgement.shouldExtract
}
