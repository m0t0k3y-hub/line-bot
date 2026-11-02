import type { ChatTurn } from '@/llm'

type StoredMessage = { role: 'user' | 'assistant'; text: string; speaker?: string | null }

// 表示名が取れなかった発言者
const UNKNOWN_SPEAKER = 'だれか'

/**
 * 保存済みのメッセージ（新しい順）から、LLM に渡す会話履歴（古い順）を組み立てる。
 *
 * - 直近 turns 往復分：新しい方から数えて turns 個目の Bot の返答より後のメッセージ
 * - ただし maxMessages 件まで
 * - withSpeakers のとき（グループ）は、ユーザーの発言の先頭に [表示名] を付ける
 * - 同じロールが続いたら1つにまとめ、先頭は user から始める
 */
export function buildHistory(
  newestFirst: StoredMessage[],
  {
    turns,
    maxMessages,
    withSpeakers = false,
  }: { turns: number; maxMessages: number; withSpeakers?: boolean },
): ChatTurn[] {
  const picked: StoredMessage[] = []
  let assistantCount = 0
  for (const message of newestFirst.slice(0, maxMessages)) {
    if (message.role === 'assistant') {
      assistantCount++
      if (assistantCount > turns) break
    }
    picked.push(message)
  }

  const merged: ChatTurn[] = []
  for (const message of picked.reverse()) {
    const content =
      withSpeakers && message.role === 'user'
        ? `[${message.speaker || UNKNOWN_SPEAKER}] ${message.text}`
        : message.text
    const last = merged.at(-1)
    if (last?.role === message.role) {
      last.content += `\n${content}`
    } else {
      merged.push({ role: message.role, content })
    }
  }

  return merged[0]?.role === 'assistant' ? merged.slice(1) : merged
}
