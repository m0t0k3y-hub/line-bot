import { describe, expect, it } from 'vitest'

import { buildHistory } from './history'

const u = (text: string) => ({ role: 'user' as const, text })
const a = (text: string) => ({ role: 'assistant' as const, text })

describe('buildHistory', () => {
  it('古い順に並べ替える', () => {
    const history = buildHistory([u('2'), a('1b'), u('1')], { turns: 10, maxMessages: 50 })
    expect(history).toEqual([
      { role: 'user', content: '1' },
      { role: 'assistant', content: '1b' },
      { role: 'user', content: '2' },
    ])
  })

  it('直近 turns 往復分だけを含める', () => {
    const newestFirst = [u('3'), a('2b'), u('2'), a('1b'), u('1')]
    expect(buildHistory(newestFirst, { turns: 1, maxMessages: 50 })).toEqual([
      { role: 'user', content: '2' },
      { role: 'assistant', content: '2b' },
      { role: 'user', content: '3' },
    ])
  })

  it('turns が 0 なら最後の Bot の返答より後だけを含める', () => {
    const newestFirst = [u('3'), u('2'), a('1b'), u('1')]
    expect(buildHistory(newestFirst, { turns: 0, maxMessages: 50 })).toEqual([
      { role: 'user', content: '2\n3' },
    ])
  })

  it('maxMessages 件で打ち切る', () => {
    const newestFirst = [u('3'), a('2b'), u('2'), a('1b'), u('1')]
    expect(buildHistory(newestFirst, { turns: 10, maxMessages: 3 })).toEqual([
      { role: 'user', content: '2' },
      { role: 'assistant', content: '2b' },
      { role: 'user', content: '3' },
    ])
  })

  it('同じロールが続いたらまとめる', () => {
    const newestFirst = [u('c'), u('b'), a('x'), u('a')]
    expect(buildHistory(newestFirst, { turns: 10, maxMessages: 50 })).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'x' },
      { role: 'user', content: 'b\nc' },
    ])
  })

  it('withSpeakers のときはユーザーの発言に話者名を付ける', () => {
    const newestFirst = [
      { role: 'user' as const, text: 'カレー！', speaker: 'はなこ' },
      { role: 'user' as const, text: '晩ごはん何がいい？', speaker: null },
      a('よかよ'),
      { role: 'user' as const, text: 'こんにちは', speaker: 'たろう' },
    ]
    expect(buildHistory(newestFirst, { turns: 10, maxMessages: 50, withSpeakers: true })).toEqual([
      { role: 'user', content: '[たろう] こんにちは' },
      { role: 'assistant', content: 'よかよ' },
      { role: 'user', content: '[だれか] 晩ごはん何がいい？\n[はなこ] カレー！' },
    ])
  })

  it('先頭が Bot の返答なら取り除く', () => {
    const newestFirst = [u('2'), a('1b'), u('1')]
    expect(buildHistory(newestFirst, { turns: 10, maxMessages: 2 })).toEqual([
      { role: 'user', content: '2' },
    ])
  })
})
