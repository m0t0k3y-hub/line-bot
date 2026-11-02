import { describe, expect, it } from 'vitest'

import { buildInstructions, cleanReply } from './context'

describe('buildInstructions', () => {
  it('1対1のトークでは相手の名前を伝える', () => {
    const result = buildInstructions('PROMPT', { type: 'user', name: 'たろう' })
    expect(result).toMatch(/^PROMPT\n\n# この会話について\n/)
    expect(result).toContain('「たろう」さんとの1対1')
  })

  it('グループではグループ名と話者の書式を伝える', () => {
    const result = buildInstructions('PROMPT', { type: 'group', name: '実験部' })
    expect(result).toContain('LINE グループ「実験部」')
    expect(result).toContain('[名前]')
  })

  it('名前がなければ名前なしの文にする', () => {
    expect(buildInstructions('P', { type: 'room', name: '' })).toContain('複数人の LINE トーク')
    expect(buildInstructions('P', { type: 'user', name: '' })).toContain('これは1対1の')
  })
})

describe('cleanReply', () => {
  it('先頭の [名前] を取り除く', () => {
    expect(cleanReply('[よし子] よかよ〜')).toBe('よかよ〜')
  })

  it('途中の [ ] はそのまま', () => {
    expect(cleanReply('今日は [晴れ] やね')).toBe('今日は [晴れ] やね')
  })

  it('取り除くと空になるならそのまま', () => {
    expect(cleanReply('[よし子]')).toBe('[よし子]')
  })
})
