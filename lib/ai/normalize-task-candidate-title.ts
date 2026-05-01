/**
 * 動詞名詞のリスト。"のXXX" / "をXXX" 末尾のパーティクルを除去するために使う。
 */
const COMPACT_NOUNS =
  '修正|確認|対応|調査|準備|整理|改善|更新|変更|追加|削除|作成|実装|設定|検討|連絡|報告|提出|送付|手配|依頼|保存|洗い出し|開発|テスト|対処|解決|展開'

/**
 * "についてXXX" → "XXX" に置き換える対象の動詞名詞。
 */
const ABOUT_NOUNS =
  '調査|確認|再確認|検討|議論|共有|整理|洗い出し|対応|準備|修正|改善|対処|解決|調整|見直し'

/**
 * 単体で残った場合に補正する抽象語マップ。
 * スコア変更目的ではなく、表示上の自然さのためのみ使用する。
 */
const ABSTRACT_AUGMENT: Record<string, string> = {
  対応: '対応内容の整理',
  調査: '調査事項の整理',
  洗い出し: '対応項目の洗い出し',
  確認: '確認事項の整理',
  検討: '検討事項の整理',
  準備: '準備事項の確認',
}

function compactSubject(subject: string): string {
  return subject
    .replace(/^(?:ただ|あと|また|なお)[、,\s]*/, '')
    .replace(/^(?:今日中に|明日までに|今週中に|来週までに|あとで|後で|一旦)\s*/, '')
    .replace(/[、,。！？!?]+$/g, '')
    .replace(/(?:さん|氏|くん|ちゃん)$/, '')
    .replace(/(も|が|は|を|の|に|で)$/, '')
    .trim()
}

function normalizeListLikePrefix(raw: string): string {
  return raw
    .replace(/^[\s・*･\-–—]+/, '')
    .replace(/^(?:TODO|ToDo|todo|要確認|要対応)[:：\s]+/i, '')
    .trim()
}

function normalizeConversationalTask(raw: string): string | null {
  const withoutSpeaker = normalizeListLikePrefix(
    raw.replace(/^(?:自分|[一-龠ぁ-んァ-ヶA-Za-z0-9_-]{1,12})[：:]\s*/, ''),
  )

  const laterConfirm = withoutSpeaker.match(/(?:あとで|後で)(.+?)確認(?:します|する|したい)?[。！？!?]*$/)
  if (laterConfirm) {
    const subject = compactSubject(laterConfirm[1])
    return subject ? `${subject}確認を行う` : '追加確認を行う'
  }

  const confirm = withoutSpeaker.match(/^(.+?)(?:ちょっと)?(?:怪しい|不明|未確定|不足).*(?:確認必要|確認が必要|要確認|確認したい|確認します|確認する|確認)(?:かも)?[。！？!?]*$/)
  if (confirm) {
    const subject = compactSubject(confirm[1])
    if (subject) return `${subject}を確認する`
  }

  const needConfirm = withoutSpeaker.match(/^(.+?)(?:確認必要|確認が必要|要確認)(?:かも)?[。！？!?]*$/)
  if (needConfirm) {
    const subject = compactSubject(needConfirm[1])
    if (subject) return `${subject}を確認する`
  }

  const fixWant = withoutSpeaker.match(/^(.+?)(?:も)?(?:変|おかしい|怪しい).*(?:修正したい|直したい|修正します|直します)[。！？!?]*$/)
  if (fixWant) {
    const subject = compactSubject(fixWant[1])
    if (subject) return `${subject}を修正する`
  }

  const fixQuestion = withoutSpeaker.match(/^(.+?)(?:直せそう|修正できそう|直す必要|修正が必要)(?:ですか)?[？?]?[。！？!?]*$/)
  if (fixQuestion) {
    const subject = compactSubject(fixQuestion[1])
    if (subject) return `${subject}を修正する`
  }

  const fixPlain = withoutSpeaker.match(/^(.+?)(?:を)?(?:修正したい|直したい)[。！？!?]*$/)
  if (fixPlain) {
    const subject = compactSubject(fixPlain[1])
    if (subject) return `${subject}を修正する`
  }

  const assigneeConfirm = withoutSpeaker.match(/^(.+?)を[^、。]*?(?:さん|氏|くん|ちゃん)に(再?確認)する[。！？!?]*$/)
  if (assigneeConfirm) {
    const subject = compactSubject(assigneeConfirm[1])
    if (subject) return `${subject}を${assigneeConfirm[2]}する`
  }

  const actionByDeadline = withoutSpeaker.match(/^(.+?)は(?:今週中に|今日中に|明日までに|来週までに)(調整|修正|確認|対応)する[。！？!?]*$/)
  if (actionByDeadline) {
    const subject = compactSubject(actionByDeadline[1])
    if (subject) return `${subject}を${actionByDeadline[2]}する`
  }

  const improveWant = withoutSpeaker.match(/^(.+?)は(?:もう少し)?(?:分かりやすく|わかりやすく)したい[。！？!?]*$/)
  if (improveWant) {
    const subject = compactSubject(improveWant[1])
    if (subject) return `${subject}を見直す`
  }

  const reviewLater = withoutSpeaker.match(/^(.+?)は(?:あとで|後で)?見直す[。！？!?]*$/)
  if (reviewLater) {
    const subject = compactSubject(reviewLater[1])
    if (subject) return `${subject}を見直す`
  }

  const requestQuestion = withoutSpeaker.match(/^(.+?)(?:を)?(確認|調整|対応|修正)(?:してもらえる|お願いできますか|できそう)[ですか]*[？?]?[。！？!?]*$/)
  if (requestQuestion) {
    const subject = compactSubject(requestQuestion[1])
    if (subject) return `${subject}を${requestQuestion[2]}する`
  }

  return null
}

/**
 * 抽出文をそのまま使うのではなく、UIに表示しやすい自然なタイトルに整形する。
 *
 * - スコアリングには使わない（`title` フィールドはそのまま保持する）
 * - `TaskCandidate.displayTitle` に格納し、UI 表示・ログ送信に使用する
 * - 元テキストが短い/すでに自然な場合はほぼそのまま返す
 */
export function normalizeTaskCandidateTitle(raw: string): string {
  let s = raw.trim()

  // 1. 先頭プレフィクス除去 ("TODO:", "要確認:" etc.)
  s = normalizeListLikePrefix(s)
  s = s.replace(/^(?:FIXME)[:：\s]+/i, '')
  s = s.replace(/^(?:自分|[一-龠ぁ-んァ-ヶA-Za-z0-9_-]{1,12})[：:]\s*/, '')

  const conversational = normalizeConversationalTask(s)
  if (conversational) return conversational

  // 2. "する必要があります" / "が必要です" 系の末尾除去
  s = s.replace(/する必要(が)?(あります|ありました|あった|ある|です|でした)(が)?$/, '')
  s = s.replace(/(が|を)必要(です|あります|ありますか?)$/, '')
  s = s.replace(/必要(が)?(あります|です)$/, '')

  // 3. "をしておく" / "してください" / "していく" 系の末尾除去
  s = s.replace(/を(して)(ください|おく|いく|いきます|みる|もらう|ほしい)$/, '')
  s = s.replace(/(して)(ください|おく|いく|いきます|みる|もらう|ほしい)$/, '')

  // 4. "する" / "します" / "していく" (+ 任意の "予定(です)")
  s = s.replace(/(する|します|していく|していきます)(予定(です)?)?$/, '')
  // "予定(です)" 単体（"対応予定です" など）
  s = s.replace(/予定(です)?$/, '')

  // 5. 末尾の助詞を除去
  s = s.replace(/(を|が|は|に|で)$/, '')

  s = s.trim()

  // 6. "〇〇についてXXX" → "〇〇XXX"
  s = s.replace(new RegExp(`について(${ABOUT_NOUNS})$`), '$1')

  // 7. "〇〇のXXX" / "〇〇をXXX" (末尾が動詞名詞) → "〇〇XXX"
  s = s.replace(new RegExp(`[のを](${COMPACT_NOUNS})$`), '$1')

  s = s.trim()

  // 変換の結果が空または1文字以下になった場合は元の文字列を返す
  if (s.length < 2) return raw.trim()

  // 8. 抽象語が単体で残った場合の補正
  if (Object.prototype.hasOwnProperty.call(ABSTRACT_AUGMENT, s)) return ABSTRACT_AUGMENT[s]!

  return s
}
