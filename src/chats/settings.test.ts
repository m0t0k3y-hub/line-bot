import { describe, expect, it } from 'vitest'

import { chatSettingsSchema, globalSettingsSchema, jstDate, resolveChatSettings } from './settings'

const settings = {
  defaultPersonaId: 'default',
  historyTurns: 10,
  historyMaxMessages: 50,
  dailyLimit: 100,
  limitMessage: '今日はもう疲れた',
}
const noOverrides = {
  personaId: null,
  historyTurns: null,
  historyMaxMessages: null,
  dailyLimit: null,
  limitMessage: null,
}

describe('resolveChatSettings', () => {
  it('上書きがなければ全体の設定を使う', () => {
    expect(resolveChatSettings(noOverrides, settings)).toEqual({
      personaId: 'default',
      historyTurns: 10,
      historyMaxMessages: 50,
      dailyLimit: 100,
      limitMessage: '今日はもう疲れた',
    })
  })

  it('チャットの上書きを優先する。0 も上書きとして扱う', () => {
    const resolved = resolveChatSettings(
      { ...noOverrides, personaId: 'p', historyTurns: 0, dailyLimit: 5, limitMessage: 'もう無理' },
      settings,
    )
    expect(resolved).toEqual({
      personaId: 'p',
      historyTurns: 0,
      historyMaxMessages: 50,
      dailyLimit: 5,
      limitMessage: 'もう無理',
    })
  })

  it('空文字の定型文は上書きしない', () => {
    expect(resolveChatSettings({ ...noOverrides, limitMessage: '' }, settings).limitMessage).toBe(
      '今日はもう疲れた',
    )
  })
})

describe('jstDate', () => {
  it('日本時間の日付を返す（UTC 15:00 で日付が変わる）', () => {
    expect(jstDate(new Date('2026-11-02T14:59:59Z'))).toBe('2026-11-02')
    expect(jstDate(new Date('2026-11-02T15:00:00Z'))).toBe('2026-11-03')
  })
})

describe('chatSettingsSchema', () => {
  const form = {
    personaId: '',
    replyMode: 'keyword',
    keywords: 'よし子さん, おばちゃん\nよし子さん、 ',
    historyTurns: '',
    historyMaxMessages: '30',
    dailyLimit: '0',
    limitMessage: '  ',
  }

  it('空欄は null（全体の設定を使う）にし、キーワードを分けて重複を除く', () => {
    expect(chatSettingsSchema.parse(form)).toEqual({
      personaId: null,
      replyMode: 'keyword',
      keywords: ['よし子さん', 'おばちゃん'],
      historyTurns: null,
      historyMaxMessages: 30,
      dailyLimit: 0,
      limitMessage: null,
    })
  })

  it('範囲外の数値は日本語のエラーにする', () => {
    const result = chatSettingsSchema.safeParse({ ...form, historyMaxMessages: '0' })
    expect(result.error?.issues[0]?.message).toBe('履歴の最大件数は 1 以上にしてください')
  })
})

describe('globalSettingsSchema', () => {
  it('時間切れは Webhook の制限に収まる範囲にする', () => {
    const result = globalSettingsSchema.safeParse({
      defaultPersonaId: 'p',
      historyTurns: '10',
      historyMaxMessages: '50',
      dailyLimit: '100',
      limitMessage: 'a',
      errorMessage: 'b',
      llmTimeoutSec: '60',
      feedbackAckEnabled: 'false',
      feedbackAckMessage: 'ありがと',
    })
    expect(result.error?.issues[0]?.message).toBe('LLM の時間切れは 50 以下にしてください')
  })
})
