import type { webhook } from '@line/bot-sdk'

import type { Chat } from '@/db/schema'

type ReplyRuleChat = Pick<Chat, 'type' | 'replyMode' | 'keywords'>

/** docs/spec.md「4.3 返信条件」 */
export function shouldReply(
  chat: ReplyRuleChat,
  message: { text: string; mention?: webhook.Mention },
): boolean {
  if (chat.type === 'user') return true

  switch (chat.replyMode) {
    case 'mention':
      return isBotMentioned(message.mention)
    case 'keyword': {
      const text = message.text.trim()
      return chat.keywords.some((keyword) => keyword !== '' && text.startsWith(keyword))
    }
    case 'all':
      return true
  }
}

function isBotMentioned(mention: webhook.Mention | undefined): boolean {
  return mention?.mentionees.some((m) => m.type === 'user' && m.isSelf === true) ?? false
}

/** Bot へのメンション（@Bot名）を本文から取り除く。何も残らなければ元の本文を返す */
export function stripBotMentions(text: string, mention: webhook.Mention | undefined): string {
  const selfMentions = (mention?.mentionees ?? [])
    .filter((m) => m.type === 'user' && m.isSelf === true)
    .sort((a, b) => b.index - a.index)

  let stripped = text
  for (const m of selfMentions) {
    stripped = stripped.slice(0, m.index) + stripped.slice(m.index + m.length)
  }
  stripped = stripped.replace(/\s+/g, ' ').trim()
  return stripped === '' ? text : stripped
}
