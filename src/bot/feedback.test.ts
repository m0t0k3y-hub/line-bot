import { describe, expect, it } from 'vitest'

import { parseFeedback } from './feedback'

describe('parseFeedback', () => {
  it('👍 / 👎 で始まれば評価にする', () => {
    expect(parseFeedback('👍')).toEqual({ rating: 1, comment: '' })
    expect(parseFeedback(' 👎 ')).toEqual({ rating: -1, comment: '' })
  })

  it('後ろの文章をコメントにする', () => {
    expect(parseFeedback('👎 博多ではそげん言わんよ')).toEqual({
      rating: -1,
      comment: '博多ではそげん言わんよ',
    })
    expect(parseFeedback('👍めっちゃ自然\n最高')).toEqual({
      rating: 1,
      comment: 'めっちゃ自然\n最高',
    })
  })

  it('肌の色の違う絵文字も受け付ける', () => {
    expect(parseFeedback('👍🏽 よか')).toEqual({ rating: 1, comment: 'よか' })
  })

  it('途中に絵文字があるだけなら評価ではない', () => {
    expect(parseFeedback('今日は👍だった')).toBeNull()
    expect(parseFeedback('こんにちは')).toBeNull()
  })
})
