import type { ChatTurn } from '@/llm'

type StoredMessage = { role: 'user' | 'assistant'; text: string }

/**
 * 保存済みのメッセージ（新しい順）から、LLM に渡す会話履歴（古い順）を組み立てる。
 *
 * - 直近 turns 往復分：新しい方から数えて turns 個目の Bot の返答より後のメッセージ
 * - ただし maxMessages 件まで
 * - 同じロールが続いたら1つにまとめ、先頭は user から始める
 */
export function buildHistory(
  newestFirst: StoredMessage[],
  { turns, maxMessages }: { turns: number; maxMessages: number },
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
    const last = merged.at(-1)
    if (last?.role === message.role) {
      last.content += `\n${message.text}`
    } else {
      merged.push({ role: message.role, content: message.text })
    }
  }

  return merged[0]?.role === 'assistant' ? merged.slice(1) : merged
}
