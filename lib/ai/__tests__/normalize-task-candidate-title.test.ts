import { describe, it, expect } from 'vitest'
import { normalizeTaskCandidateTitle } from '../normalize-task-candidate-title'

// ─── ユーザー仕様の変換例 ────────────────────────────────────────

describe('ユーザー仕様: 候補タイトルの自然化', () => {
  it('「APIの修正が必要です」→ 「API修正」', () => {
    expect(normalizeTaskCandidateTitle('APIの修正が必要です')).toBe('API修正')
  })

  it('「詳細画面を確認する必要があります」→ 「詳細画面確認」', () => {
    expect(normalizeTaskCandidateTitle('詳細画面を確認する必要があります')).toBe('詳細画面確認')
  })

  it('「テスト環境の準備をしておく」→ 「テスト環境準備」', () => {
    expect(normalizeTaskCandidateTitle('テスト環境の準備をしておく')).toBe('テスト環境準備')
  })

  it('「〇〇について調査する」→ 「〇〇調査」', () => {
    expect(normalizeTaskCandidateTitle('〇〇について調査する')).toBe('〇〇調査')
  })
})

describe('Slack風テキスト: 候補タイトルの自然化', () => {
  it('発言者名と確認系の口語表現を除去する', () => {
    expect(normalizeTaskCandidateTitle('田中：API仕様ちょっと怪しいので確認必要かも')).toBe(
      'API仕様を確認する',
    )
  })

  it('修正したい表現をタスク表現に寄せる', () => {
    expect(normalizeTaskCandidateTitle('佐藤：ログも変なので修正したい')).toBe('ログを修正する')
  })

  it('疑問形の直せそうを修正タスクに寄せる', () => {
    expect(normalizeTaskCandidateTitle('山本：明日までにエラー画面直せそう？')).toBe(
      'エラー画面を修正する',
    )
  })

  it('あとで追加確認しますを確認タスクに寄せる', () => {
    expect(normalizeTaskCandidateTitle('自分：一旦修正入れて、あとで追加確認します')).toBe(
      '追加確認を行う',
    )
  })
})

// ─── 抽象語のみ → 補正 ────────────────────────────────────────

describe('ユーザー仕様: 抽象タスクの表現改善', () => {
  it('「対応」→ 「対応内容の整理」', () => {
    expect(normalizeTaskCandidateTitle('対応')).toBe('対応内容の整理')
  })

  it('「調査」→ 「調査事項の整理」', () => {
    expect(normalizeTaskCandidateTitle('調査')).toBe('調査事項の整理')
  })

  it('「洗い出し」→ 「対応項目の洗い出し」', () => {
    expect(normalizeTaskCandidateTitle('洗い出し')).toBe('対応項目の洗い出し')
  })
})

// ─── 各変換ルール ─────────────────────────────────────────────

describe('Rule 1: 先頭プレフィクス除去', () => {
  it('「TODO: カンバンカードの並び順を保存する」→ 「カンバンカードの並び順保存」', () => {
    expect(normalizeTaskCandidateTitle('TODO: カンバンカードの並び順を保存する')).toBe(
      'カンバンカードの並び順保存',
    )
  })

  it('「要確認: 設計書の承認」→ 「設計書の承認」', () => {
    expect(normalizeTaskCandidateTitle('要確認: 設計書の承認')).toBe('設計書の承認')
  })
})

describe('Rule 2: する必要があります / が必要です 系', () => {
  it('「追加修正が必要です」→ 「追加修正」', () => {
    expect(normalizeTaskCandidateTitle('追加修正が必要です')).toBe('追加修正')
  })

  it('「APIレスポンスの型定義を修正する必要があります」→ 「APIレスポンスの型定義修正」', () => {
    expect(normalizeTaskCandidateTitle('APIレスポンスの型定義を修正する必要があります')).toBe(
      'APIレスポンスの型定義修正',
    )
  })

  it('「詳細画面の確認が必要です」→ 「詳細画面確認」', () => {
    expect(normalizeTaskCandidateTitle('詳細画面の確認が必要です')).toBe('詳細画面確認')
  })
})

describe('Rule 3: してください / をしておく 系', () => {
  it('「確認してください」→ 「確認」→ 「確認事項の整理」', () => {
    expect(normalizeTaskCandidateTitle('確認してください')).toBe('確認事項の整理')
  })

  it('「テスト環境の準備をしておく」→ 「テスト環境準備」', () => {
    expect(normalizeTaskCandidateTitle('テスト環境の準備をしておく')).toBe('テスト環境準備')
  })
})

describe('Rule 4: する / します / 予定 系', () => {
  it('「〇〇について調査する」→ 「〇〇調査」', () => {
    expect(normalizeTaskCandidateTitle('〇〇について調査する')).toBe('〇〇調査')
  })

  it('「対応予定です」→ 「対応内容の整理」', () => {
    expect(normalizeTaskCandidateTitle('対応予定です')).toBe('対応内容の整理')
  })

  it('「次回確認予定」→ 「次回確認」', () => {
    expect(normalizeTaskCandidateTitle('次回確認予定')).toBe('次回確認')
  })

  it('「調整していきます」→ 「調整」はそのまま残る（抽象補正対象外）', () => {
    expect(normalizeTaskCandidateTitle('調整していきます')).toBe('調整')
  })
})

describe('Rule 6/7: について / のを 前置詞除去', () => {
  it('「設計についての検討」→ 検討 前の "についての" は非対象（Rule6は末尾のみ）', () => {
    // "設計についての検討" - "の検討" が末尾 → Rule7 で "設計について検討" になる
    expect(normalizeTaskCandidateTitle('設計についての検討')).toBe('設計について検討')
  })

  it('「詳細画面の確認」→ 「詳細画面確認」', () => {
    expect(normalizeTaskCandidateTitle('詳細画面の確認')).toBe('詳細画面確認')
  })

  it('「機能の実装」→ 「機能実装」', () => {
    expect(normalizeTaskCandidateTitle('機能の実装')).toBe('機能実装')
  })
})

// ─── 変換すべきでないケース ────────────────────────────────────

describe('変換抑止: 既に自然なタイトル', () => {
  it('「回答待ちです」→ そのまま', () => {
    expect(normalizeTaskCandidateTitle('回答待ちです')).toBe('回答待ちです')
  })

  it('「先方に確認依頼済みです」→ そのまま', () => {
    expect(normalizeTaskCandidateTitle('先方に確認依頼済みです')).toBe('先方に確認依頼済みです')
  })

  it('「A社からの確認待ちです」→ そのまま', () => {
    expect(normalizeTaskCandidateTitle('A社からの確認待ちです')).toBe('A社からの確認待ちです')
  })

  it('トランケートされた「〇〇…」→ そのまま返す（末尾パターン不一致）', () => {
    const truncated = 'APIレスポンスの型定義を修正する必…'
    expect(normalizeTaskCandidateTitle(truncated)).toBe(truncated)
  })
})

// ─── エッジケース ─────────────────────────────────────────────

describe('エッジケース', () => {
  it('空文字列 → 空文字列', () => {
    expect(normalizeTaskCandidateTitle('')).toBe('')
  })

  it('1文字のみ → 元のまま（2文字未満ガード）', () => {
    expect(normalizeTaskCandidateTitle('A')).toBe('A')
  })

  it('前後に空白がある → トリムして処理', () => {
    expect(normalizeTaskCandidateTitle('  詳細画面の確認が必要です  ')).toBe('詳細画面確認')
  })

  it('すでに自然なタイトル「API修正」→ そのまま', () => {
    expect(normalizeTaskCandidateTitle('API修正')).toBe('API修正')
  })
})
