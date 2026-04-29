import { describe, it, expect } from 'vitest'
import {
  judgeExtractionClause,
  shouldCreateTaskCandidate,
  splitReportIntoClauses,
} from '../clause-extraction-judge'

// ─── splitReportIntoClauses ────────────────────────────────────

describe('splitReportIntoClauses', () => {
  it('done + todo 混在文を節単位で分割する（しましたが）', () => {
    const input = '一覧画面は修正しましたが、詳細画面の確認が必要です'
    const result = splitReportIntoClauses(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('一覧画面は修正しました')
    expect(result[1]).toBe('詳細画面の確認が必要です')
  })

  it('ただし、を文境界として分割する', () => {
    const input = '現在対応中ですただし、確認が必要な点が残っています'
    const result = splitReportIntoClauses(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('現在対応中です')
    expect(result[1]).toBe('確認が必要な点が残っています')
  })

  it('なお、を文境界として分割する', () => {
    const input = '対応は完了しましたなお、ログ出力の修正が必要です'
    const result = splitReportIntoClauses(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('対応は完了しました')
    expect(result[1]).toBe('ログ出力の修正が必要です')
  })

  it('確認しましたが を分割する', () => {
    const input = '確認しましたが、追加修正が必要です'
    const result = splitReportIntoClauses(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('確認しました')
    expect(result[1]).toBe('追加修正が必要です')
  })

  it('句点で文を分割する', () => {
    const input = '先方に確認依頼済みです。回答待ちです'
    const result = splitReportIntoClauses(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('先方に確認依頼済みです')
    expect(result[1]).toBe('回答待ちです')
  })

  it('改行で分割する', () => {
    const input = '完了しました\n次回対応予定です'
    const result = splitReportIntoClauses(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('完了しました')
    expect(result[1]).toBe('次回対応予定です')
  })
})

// ─── judgeExtractionClause ───────────────────────────────────

describe('judgeExtractionClause', () => {
  // ─── done
  it('ケース1: 「資料を修正しました」→ done、候補化しない', () => {
    const j = judgeExtractionClause('資料を修正しました')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('完了を含む節 → done', () => {
    const j = judgeExtractionClause('タスク完了')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('確認済みを含む節 → done', () => {
    const j = judgeExtractionClause('内容は確認済みです')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  // ─── todo
  it('ケース4: 「APIレスポンスの型定義を修正する必要があります」→ todo、候補化する', () => {
    const j = judgeExtractionClause('APIレスポンスの型定義を修正する必要があります')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
    expect(j.reasons.some((r) => r.includes('todo'))).toBe(true)
  })

  it('ケース6: 「TODO: カンバンカードの並び順を保存する」→ todo', () => {
    const j = judgeExtractionClause('TODO: カンバンカードの並び順を保存する')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('要確認を含む節 → todo', () => {
    const j = judgeExtractionClause('要確認: 設計書の承認')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('必要を含む節 → todo', () => {
    const j = judgeExtractionClause('追加修正が必要です')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('次回を含む節 → todo', () => {
    const j = judgeExtractionClause('次回確認予定')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  // ─── waiting
  it('ケース3a: 「先方に確認依頼済みです」→ waiting、候補化する', () => {
    const j = judgeExtractionClause('先方に確認依頼済みです')
    expect(j.status).toBe('waiting')
    expect(j.shouldExtract).toBe(true)
    expect(j.reasons.some((r) => r.includes('waiting'))).toBe(true)
  })

  it('ケース3b: 「回答待ちです」→ waiting', () => {
    const j = judgeExtractionClause('回答待ちです')
    expect(j.status).toBe('waiting')
    expect(j.shouldExtract).toBe(true)
  })

  it('確認待ちを含む節 → waiting', () => {
    const j = judgeExtractionClause('A社からの確認待ちです')
    expect(j.status).toBe('waiting')
    expect(j.shouldExtract).toBe(true)
  })

  // ─── memo
  it('ケース5: 「共有のみです」→ memo、候補化しない', () => {
    const j = judgeExtractionClause('共有のみです')
    expect(j.status).toBe('memo')
    expect(j.shouldExtract).toBe(false)
  })

  it('備考を含む節 → memo', () => {
    const j = judgeExtractionClause('備考: 参考情報として')
    expect(j.status).toBe('memo')
    expect(j.shouldExtract).toBe(false)
  })

  // ─── 優先順位検証
  it('memo と todo が混在する場合は memo 優先', () => {
    const j = judgeExtractionClause('メモ: 次回確認する')
    expect(j.status).toBe('memo')
    expect(j.shouldExtract).toBe(false)
  })

  it('waiting と todo が混在する場合は waiting 優先', () => {
    const j = judgeExtractionClause('回答待ちですが必要があれば対応する')
    expect(j.status).toBe('waiting')
    expect(j.shouldExtract).toBe(true)
  })

  // ─── 対応済み（done）が todo の短形式を上書きする
  it('「対応済みです」→ done（"対応" が done の一部として吸収される）', () => {
    const j = judgeExtractionClause('対応済みです')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  // ─── in-progress（新規除外ルール）
  it('「対応中です」→ done、候補化しない', () => {
    const j = judgeExtractionClause('対応中です')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('「実施中です」→ done、候補化しない', () => {
    const j = judgeExtractionClause('実施中です')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('「確認しています」→ done、候補化しない', () => {
    const j = judgeExtractionClause('確認しています')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('「対応しています」→ done、候補化しない', () => {
    const j = judgeExtractionClause('対応しています')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('in-progress + spec-todo 混在 → spec-todo 優先で候補化する', () => {
    const j = judgeExtractionClause('対応中ですが確認が必要です')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  // ─── status-only（新規除外ルール）
  it('「問題ありません」→ memo、候補化しない', () => {
    const j = judgeExtractionClause('問題ありません')
    expect(j.status).toBe('memo')
    expect(j.shouldExtract).toBe(false)
  })

  it('「順調に進んでいます」→ memo、候補化しない', () => {
    const j = judgeExtractionClause('順調に進んでいます')
    expect(j.status).toBe('memo')
    expect(j.shouldExtract).toBe(false)
  })

  it('「特に問題なし」→ memo、候補化しない', () => {
    const j = judgeExtractionClause('特に問題なし')
    expect(j.status).toBe('memo')
    expect(j.shouldExtract).toBe(false)
  })

  it('status-only + spec-todo 混在 → spec-todo 優先で候補化する', () => {
    const j = judgeExtractionClause('問題なく対応できましたが確認が必要な点があります')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  // ─── unknown
  it('キーワードなし → unknown', () => {
    const j = judgeExtractionClause('本日はありがとうございました')
    expect(j.status).toBe('unknown')
    expect(j.shouldExtract).toBe(false)
  })
})

// ─── 統合: splitReportIntoClauses + judgeExtractionClause ─────

describe('統合テスト', () => {
  function extractCandidateClauses(text: string): string[] {
    return splitReportIntoClauses(text).filter((clause) =>
      shouldCreateTaskCandidate(judgeExtractionClause(clause)),
    )
  }

  it('ケース1: 「資料を修正しました」→ 候補なし', () => {
    expect(extractCandidateClauses('資料を修正しました')).toHaveLength(0)
  })

  it('ケース2: 混在文 → 「詳細画面の確認が必要です」のみ抽出', () => {
    const result = extractCandidateClauses('一覧画面は修正しましたが、詳細画面の確認が必要です')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('詳細画面の確認が必要です')
  })

  it('ケース3: 待機文 → 両節とも waiting として抽出', () => {
    const result = extractCandidateClauses('先方に確認依頼済みです。回答待ちです')
    expect(result).toHaveLength(2)
    expect(result.every((c) => judgeExtractionClause(c).status === 'waiting')).toBe(true)
  })

  it('ケース4: API 修正 → 候補あり', () => {
    const result = extractCandidateClauses('APIレスポンスの型定義を修正する必要があります')
    expect(result).toHaveLength(1)
    expect(judgeExtractionClause(result[0]).status).toBe('todo')
  })

  it('ケース5: 「共有のみです」→ 候補なし', () => {
    expect(extractCandidateClauses('共有のみです')).toHaveLength(0)
  })

  it('ケース8: 「API修正を実施しました」→ 候補なし（完了報告）', () => {
    expect(extractCandidateClauses('API修正を実施しました')).toHaveLength(0)
  })

  it('ケース9: 「現在対応中です」→ 候補なし（進行中）', () => {
    expect(extractCandidateClauses('現在対応中です')).toHaveLength(0)
  })

  it('ケース10: 「特に問題はありません」→ 候補なし（状況説明）', () => {
    expect(extractCandidateClauses('特に問題はありません')).toHaveLength(0)
  })

  it('ケース11: ただし で分割し todo 節のみ抽出する', () => {
    const result = extractCandidateClauses('現在対応中ですただし、確認が必要な点が残っています')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('確認が必要な点が残っています')
  })

  it('ケース6: TODO 文 → 候補あり', () => {
    const result = extractCandidateClauses('TODO: カンバンカードの並び順を保存する')
    expect(result).toHaveLength(1)
    expect(judgeExtractionClause(result[0]).status).toBe('todo')
  })

  it('ケース7: 「確認しましたが、追加修正が必要です」→ 「追加修正が必要です」を抽出', () => {
    const result = extractCandidateClauses('確認しましたが、追加修正が必要です')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('追加修正が必要です')
    expect(judgeExtractionClause(result[0]).status).toBe('todo')
  })
})

// ─── legacy-todo 後方互換テスト ───────────────────────────────

describe('legacy-todo 後方互換（活用形・短形式ステム）', () => {
  it('「修正を進める予定です」→ todo（"修正する" の活用形をカバー）', () => {
    const j = judgeExtractionClause('修正を進める予定です')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
    expect(j.reasons.some((r) => r.includes('todo(legacy)'))).toBe(true)
  })

  it('「確認します」→ todo（"確認する" の活用形をカバー）', () => {
    const j = judgeExtractionClause('確認します')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('「準備中です」→ todo（"準備する" の活用形をカバー）', () => {
    const j = judgeExtractionClause('準備中です')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('「調整していきます」→ todo（"調整する" の活用形をカバー）', () => {
    const j = judgeExtractionClause('調整していきます')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('「修正しました」→ done（legacy "修正" が "しました" に負ける）', () => {
    const j = judgeExtractionClause('修正しました')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('「確認しました」→ done（legacy "確認" が "しました" に負ける）', () => {
    const j = judgeExtractionClause('確認しました')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('「確認済みです」→ done（legacy "確認" が "確認済み" に吸収される）', () => {
    const j = judgeExtractionClause('確認済みです')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  it('「確認待ちです」→ waiting（legacy "確認" が "確認待ち" に吸収される）', () => {
    const j = judgeExtractionClause('確認待ちです')
    expect(j.status).toBe('waiting')
    expect(j.shouldExtract).toBe(true)
  })

  it('「対応予定です」→ todo（legacy "対応"、"対応済み" は不在）', () => {
    const j = judgeExtractionClause('対応予定です')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('「対応済みです」→ done（legacy "対応" が "対応済み" に吸収される）', () => {
    const j = judgeExtractionClause('対応済みです')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  // ─── 今週 ───
  it('「今週中にダッシュボードの表示を見直します」→ todo（今週 legacy todo）', () => {
    const j = judgeExtractionClause('今週中にダッシュボードの表示を見直します')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
    expect(j.reasons.some((r) => r.includes('todo(legacy)'))).toBe(true)
  })

  it('「今週は対応済みです」→ done（今週 legacy が対応済み done に負ける）', () => {
    const j = judgeExtractionClause('今週は対応済みです')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })

  // ─── 残タスク / 残作業 ───
  it('「デザイン反映の残タスクがあります」→ todo（残タスク legacy todo）', () => {
    const j = judgeExtractionClause('デザイン反映の残タスクがあります')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
    expect(j.reasons.some((r) => r.includes('todo(legacy)'))).toBe(true)
  })

  it('「残作業がある」→ todo（残作業 legacy todo）', () => {
    const j = judgeExtractionClause('残作業がある')
    expect(j.status).toBe('todo')
    expect(j.shouldExtract).toBe(true)
  })

  it('「残タスクは完了しました」→ done（残タスク legacy が done に負ける）', () => {
    const j = judgeExtractionClause('残タスクは完了しました')
    expect(j.status).toBe('done')
    expect(j.shouldExtract).toBe(false)
  })
})
