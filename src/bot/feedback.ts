/**
 * 評価メッセージ（docs/spec.md「4.6」）を読み取る。👍 か 👎 で始まれば評価とみなし、後ろの文章をコメントにする。
 * 肌の色の違う絵文字（👍🏻 など）や異体字セレクタ付きのものも受け付ける。
 */
export function parseFeedback(text: string): { rating: 1 | -1; comment: string } | null {
  const match = /^\s*(👍|👎)[\u{1F3FB}-\u{1F3FF}️]*\s*([\s\S]*)$/u.exec(text)
  if (!match) return null
  return { rating: match[1] === '👍' ? 1 : -1, comment: match[2].trim() }
}
