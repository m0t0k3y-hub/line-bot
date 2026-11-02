import type { Chat } from '@/db/schema'

/** ペルソナのシステムプロンプトに、会話の場所についての補足を付け足す（docs/spec.md「6.2」） */
export function buildInstructions(systemPrompt: string, chat: Pick<Chat, 'type' | 'name'>): string {
  const note =
    chat.type === 'user'
      ? chat.name
        ? `これは「${chat.name}」さんとの1対1の LINE トークです。`
        : 'これは1対1の LINE トークです。'
      : [
          chat.name
            ? `これは LINE グループ「${chat.name}」での会話です。`
            : 'これは複数人の LINE トークでの会話です。',
          'ユーザーの発言の先頭にある [名前] は、その発言をした人の表示名です。',
          '返答の先頭に [名前] を付けないでください。',
        ].join('')

  return `${systemPrompt}\n\n# この会話について\n${note}`
}

/** 履歴の書式を真似して返答の先頭に付いた [名前] を取り除く */
export function cleanReply(text: string): string {
  return text.replace(/^\[[^\]\n]{1,30}\]\s*/, '').trim() || text
}
