import { scoreTaskCandidate } from '@/lib/ai/task-candidate-score'
import type { TaskCandidate } from '@/lib/types'

const MIN_SIMILAR_KEY_LENGTH = 5
const MIN_PARTIAL_LENGTH_RATIO = 0.6
const MIN_CHAR_SIMILARITY = 0.82

/**
 * displayTitle を正規化して重複検出用のキーを生成する。
 *
 * 変換ルール（順に適用）:
 *   1. NFKC 正規化・小文字化
 *   2. 「です」「します」「が必要です」などの軽い末尾表現を削除
 *   3. 助詞（の・を・に・が・は）削除
 *   4. 空白（半角・全角）削除
 *   5. 記号削除
 *
 * 例:
 *   "APIの修正" → "api修正"
 *   "API修正"   → "api修正"
 *   "APIを修正" → "api修正"
 */
export function buildTaskCandidateKey(title: string): string {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/する必要(が)?(あります|ありました|あった|ある|です|でした)(が)?$/g, '')
    .replace(/が必要です$/g, '')
    .replace(/(です|でした|します|しました|する)$/g, '')
    .replace(/[のをにがは]/g, '')
    .replace(/[\s　]+/g, '')
    .replace(/[！？!?,.\-_()（）「」【】『』\[\]。、…・;:'"]/g, '')
}

function characterSimilarity(a: string, b: string): number {
  const aChars = new Set([...a])
  const bChars = new Set([...b])
  const union = new Set([...aChars, ...bChars])
  if (union.size === 0) return 1

  let intersectionCount = 0
  for (const char of aChars) {
    if (bChars.has(char)) intersectionCount += 1
  }

  return intersectionCount / union.size
}

function areSimilarTaskCandidateKeys(a: string, b: string): boolean {
  if (a === b) return true
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a

  if (shorter.length < MIN_SIMILAR_KEY_LENGTH) return false

  const lengthRatio = shorter.length / longer.length
  if (lengthRatio < MIN_PARTIAL_LENGTH_RATIO) return false

  if (longer.includes(shorter)) return true

  return characterSimilarity(a, b) >= MIN_CHAR_SIMILARITY
}

interface TaskCandidateMergeGroup {
  keys: string[]
  candidates: TaskCandidate[]
}

/**
 * 同一・類似キーを持つ候補を統合し、重複を除去する。
 *
 * グループ内で最高スコアの候補を代表とし、
 * `mergedCount`・`mergedTitles`・`extractionReasons`（union）を付与する。
 * スコア計算・extractionStatus・displayTitle ロジックは変更しない。
 */
export function mergeTaskCandidates(candidates: TaskCandidate[]): TaskCandidate[] {
  const groups: TaskCandidateMergeGroup[] = []

  for (const c of candidates) {
    const key = buildTaskCandidateKey(c.displayTitle ?? c.title)
    const existingGroup = groups.find((group) =>
      group.keys.some((groupKey) => areSimilarTaskCandidateKeys(key, groupKey))
    )

    if (existingGroup) {
      existingGroup.keys.push(key)
      existingGroup.candidates.push(c)
    } else {
      groups.push({ keys: [key], candidates: [c] })
    }
  }

  const result: TaskCandidate[] = []

  for (const { candidates: group } of groups) {
    if (group.length === 1) {
      result.push(group[0])
      continue
    }

    // スコア降順で代表候補を選ぶ（同点は元の順序を維持）
    const scored = group.map((c, originalIndex) => ({
      c,
      score: scoreTaskCandidate(c).score,
      originalIndex,
    }))
    scored.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)

    const representative: TaskCandidate = { ...scored[0].c }

    representative.mergedCount = group.length
    representative.mergedTitles = group.map((c) => c.displayTitle ?? c.title)

    const unionedReasons = Array.from(
      new Set(group.flatMap((c) => c.extractionReasons ?? []))
    )
    if (unionedReasons.length > 0) {
      representative.extractionReasons = unionedReasons
    }

    result.push(representative)
  }

  return result
}
