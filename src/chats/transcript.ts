// 会話ログを、分析に使うテキストとして書き出す（docs/spec.md「5.8」）

export type TranscriptMessage = {
  role: 'user' | 'assistant'
  speaker: string | null
  text: string
  createdAt: Date
}

const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Tokyo',
})

function periodLabel(from?: string, to?: string): string {
  if (!from && !to) return 'すべて'
  return `${`${from ?? ''} 〜 ${to ?? ''}`.trim()}（日本時間）`
}

/** messages は古い順に渡す */
export function formatTranscript(input: {
  chatName: string
  from?: string
  to?: string
  messages: TranscriptMessage[]
}): string {
  const header = [
    `# 会話ログ：${input.chatName || '（名前なし）'}`,
    `# 期間：${periodLabel(input.from, input.to)}`,
  ].join('\n')

  const body = input.messages.map((message) => {
    const speaker = message.role === 'assistant' ? 'Bot' : message.speaker || '（名前不明）'
    return `${dateTimeFormat.format(message.createdAt)} ${speaker}：${message.text}`
  })

  return [header, ...body].join('\n\n') + '\n'
}
