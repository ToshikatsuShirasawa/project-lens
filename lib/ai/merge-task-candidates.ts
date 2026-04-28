import { scoreTaskCandidate } from '@/lib/ai/task-candidate-score'
import type { TaskCandidate } from '@/lib/types'

/**
 * displayTitle を正規化して重複検出用のキーを生成する。
 *
 * 変換ルール（順に適用）:
 *   1. 小文字化
 *   2. 助詞（の・を・に・が・は）削除
 *   3. 空白（半角・全角）削除
 *   4. 記号削除
 *
 * 例:
 *   "APIの修正" → "api修正"
 *   "API修正"   → "api修正"
 *   "APIを修正" → "api修正"
 */
export function buildTaskCandidateKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[のをにがは]/g, '')
    .replace(/[\s　]+/g, '')
    .replace(/[！？!?,.\-_()（）「」【】『』\[\]。、…・;:'"]/g, '')
}

/**
 * 同一キーを持つ候補を統合し、重複を除去する。
 *
 * グループ内で最高スコアの候補を代表とし、
 * `mergedCount`・`mergedTitles`・`extractionReasons`（union）を付与する。
 * スコア計算・extractionStatus・displayTitle ロジックは変更しない。
 */
export function mergeTaskCandidates(candidates: TaskCandidate[]): TaskCandidate[] {
  const groups = new Map<string, TaskCandidate[]>()

  for (const c of candidates) {
    const key = buildTaskCandidateKey(c.displayTitle ?? c.title)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  const result: TaskCandidate[] = []

  for (const group of groups.values()) {
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
