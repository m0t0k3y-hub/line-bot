import type { webhook } from '@line/bot-sdk'
import { describe, expect, it } from 'vitest'

import { shouldReply, stripBotMentions } from './reply-rule'

const selfMention = (index: number, length: number): webhook.Mentionee => ({
  type: 'user',
  index,
  length,
  isSelf: true,
})
const otherMention = (index: number, length: number): webhook.Mentionee => ({
  type: 'user',
  index,
  length,
  userId: 'U-other',
})

const group = { type: 'group' as const, replyMode: 'mention' as const, keywords: [] }

describe('shouldReply', () => {
  it('1対1のトークには常に返信する', () => {
    expect(shouldReply({ ...group, type: 'user' }, { text: 'こんにちは' })).toBe(true)
  })

  it('mention：Bot がメンションされたときだけ返信する', () => {
    const text = '@よし子 こんにちは'
    expect(shouldReply(group, { text, mention: { mentionees: [selfMention(0, 4)] } })).toBe(true)
    expect(shouldReply(group, { text, mention: { mentionees: [otherMention(0, 4)] } })).toBe(false)
    expect(shouldReply(group, { text: 'こんにちは' })).toBe(false)
  })

  it('mention：@All では返信しない', () => {
    const mention: webhook.Mention = { mentionees: [{ type: 'all', index: 0, length: 4 }] }
    expect(shouldReply(group, { text: '@All 集合', mention })).toBe(false)
  })

  it('keyword：キーワードで始まる発言に返信する', () => {
    const chat = { ...group, replyMode: 'keyword' as const, keywords: ['よし子さん', 'おばちゃん'] }
    expect(shouldReply(chat, { text: '  おばちゃん聞いて' })).toBe(true)
    expect(shouldReply(chat, { text: 'ねえ、おばちゃん' })).toBe(false)
  })

  it('keyword：空のキーワードは無視する', () => {
    const chat = { ...group, replyMode: 'keyword' as const, keywords: [''] }
    expect(shouldReply(chat, { text: 'なんでも' })).toBe(false)
  })

  it('all：すべての発言に返信する', () => {
    expect(shouldReply({ ...group, replyMode: 'all' }, { text: 'なんでも' })).toBe(true)
  })
})

describe('stripBotMentions', () => {
  it('Bot へのメンションだけを取り除く', () => {
    const text = '@よし子 @たろう にごはん教えて'
    const mention = { mentionees: [selfMention(0, 4), otherMention(5, 4)] }
    expect(stripBotMentions(text, mention)).toBe('@たろう にごはん教えて')
  })

  it('文の途中のメンションも取り除く', () => {
    expect(stripBotMentions('ねえ @よし子 聞いて', { mentionees: [selfMention(3, 4)] })).toBe(
      'ねえ 聞いて',
    )
  })

  it('メンションしかなければ元の本文を返す', () => {
    expect(stripBotMentions('@よし子', { mentionees: [selfMention(0, 4)] })).toBe('@よし子')
  })
})
