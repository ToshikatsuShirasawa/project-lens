import { describe, it, expect } from 'vitest'
import { generateCandidateKey, normalizeTitle } from '../candidate-key'

describe('normalizeTitle', () => {
  it('前後の空白を除去する', () => {
    expect(normalizeTitle('  API確認  ')).toBe('api確認')
  })

  it('連続空白を1つにまとめる', () => {
    expect(normalizeTitle('API   仕様   確認')).toBe('api 仕様 確認')
  })

  it('大文字を小文字にする', () => {
    expect(normalizeTitle('API仕様確認')).toBe('api仕様確認')
  })

  it('全角英数字を半角に正規化する（NFKC）', () => {
    expect(normalizeTitle('ＡＰＩ仕様確認')).toBe('api仕様確認')
  })

  it('全角スペースを半角スペースに正規化する', () => {
    expect(normalizeTitle('API　仕様確認')).toBe('api 仕様確認')
  })
})

describe('generateCandidateKey', () => {
  it('同じ projectId + title なら同じキーを返す', () => {
    const key1 = generateCandidateKey('proj-1', 'API仕様の確認')
    const key2 = generateCandidateKey('proj-1', 'API仕様の確認')
    expect(key1).toBe(key2)
  })

  it('異なる projectId なら別のキーを返す', () => {
    const key1 = generateCandidateKey('proj-1', 'API仕様の確認')
    const key2 = generateCandidateKey('proj-2', 'API仕様の確認')
    expect(key1).not.toBe(key2)
  })

  it('全角英数字と半角英数字を同一視する', () => {
    const key1 = generateCandidateKey('proj-1', 'API仕様確認')
    const key2 = generateCandidateKey('proj-1', 'ＡＰＩ仕様確認')
    expect(key1).toBe(key2)
  })

  it('前後の空白が違っても同じキーを返す', () => {
    const key1 = generateCandidateKey('proj-1', 'API確認')
    const key2 = generateCandidateKey('proj-1', '  API確認  ')
    expect(key1).toBe(key2)
  })

  it('連続空白が違っても同じキーを返す', () => {
    const key1 = generateCandidateKey('proj-1', 'API 仕様 確認')
    const key2 = generateCandidateKey('proj-1', 'API   仕様   確認')
    expect(key1).toBe(key2)
  })

  it('16文字の16進数文字列を返す', () => {
    const key = generateCandidateKey('proj-1', 'API仕様の確認')
    expect(key).toHaveLength(16)
    expect(key).toMatch(/^[0-9a-f]{16}$/)
  })

  it('異なるタイトルなら別のキーを返す', () => {
    const key1 = generateCandidateKey('proj-1', 'API仕様の確認')
    const key2 = generateCandidateKey('proj-1', 'DB設計のレビュー')
    expect(key1).not.toBe(key2)
  })

  it('projectId が空文字でもキーを生成できる', () => {
    const key = generateCandidateKey('', 'API確認')
    expect(key).toHaveLength(16)
    expect(key).toMatch(/^[0-9a-f]{16}$/)
  })
})
