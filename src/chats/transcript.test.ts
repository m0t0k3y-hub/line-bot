import { describe, expect, it } from 'vitest'

import { formatTranscript } from './transcript'

const at = (iso: string) => new Date(iso)

describe('formatTranscript', () => {
  it('見出しの後に、日本時間の日時と発言者を付けて空行で区切る', () => {
    const text = formatTranscript({
      chatName: 'たろう',
      from: '2026-11-10',
      to: '2026-11-12',
      messages: [
        {
          role: 'user',
          speaker: 'たろう',
          text: 'はじめます',
          createdAt: at('2026-11-10T11:03:00Z'),
        },
        {
          role: 'assistant',
          speaker: null,
          text: 'こんばんは。',
          createdAt: at('2026-11-10T11:03:20Z'),
        },
      ],
    })
    expect(text).toBe(
      [
        '# 会話ログ：たろう',
        '# 期間：2026-11-10 〜 2026-11-12（日本時間）',
        '',
        '2026/11/10 20:03 たろう：はじめます',
        '',
        '2026/11/10 20:03 Bot：こんばんは。',
        '',
      ].join('\n'),
    )
  })

  it('日本時間で日付をまたぐ', () => {
    const text = formatTranscript({
      chatName: 'たろう',
      messages: [
        { role: 'user', speaker: 'たろう', text: 'a', createdAt: at('2026-11-10T15:30:00Z') },
      ],
    })
    expect(text).toContain('2026/11/11 00:30 たろう：a')
  })

  it('期間がなければ「すべて」、片方だけならその端だけを書く', () => {
    expect(formatTranscript({ chatName: 'x', messages: [] })).toContain('# 期間：すべて')
    expect(formatTranscript({ chatName: 'x', from: '2026-11-10', messages: [] })).toContain(
      '# 期間：2026-11-10 〜（日本時間）',
    )
    expect(formatTranscript({ chatName: 'x', to: '2026-11-10', messages: [] })).toContain(
      '# 期間：〜 2026-11-10（日本時間）',
    )
  })

  it('表示名が分からない発言と、名前のないチャット', () => {
    const text = formatTranscript({
      chatName: '',
      messages: [{ role: 'user', speaker: null, text: 'a', createdAt: at('2026-11-10T00:00:00Z') }],
    })
    expect(text).toContain('# 会話ログ：（名前なし）')
    expect(text).toContain('（名前不明）：a')
  })

  it('複数行の発言はそのまま残す', () => {
    const text = formatTranscript({
      chatName: 'x',
      messages: [
        {
          role: 'assistant',
          speaker: null,
          text: '1行目\n2行目',
          createdAt: at('2026-11-10T00:00:00Z'),
        },
      ],
    })
    expect(text).toContain('Bot：1行目\n2行目')
  })
})
