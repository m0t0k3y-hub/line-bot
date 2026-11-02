import { describe, expect, it } from 'vitest'

import {
  isSameConfig,
  type PersonaConfig,
  type PersonaConfigForm,
  personaConfigFormSchema,
  toConfigForm,
} from './config'
import { diffConfigs } from './diff'

const config: PersonaConfig = {
  systemPrompt: '博多弁で話す',
  fewShots: [{ user: 'こんにちは', assistant: 'こんにちは〜' }],
  provider: 'google',
  model: 'gemini-flash-latest',
  maxOutputTokens: 2048,
  providerOptions: {},
}

const form = (overrides: Partial<PersonaConfigForm> = {}): PersonaConfigForm => ({
  ...toConfigForm(config),
  ...overrides,
})

describe('personaConfigFormSchema', () => {
  it('フォームの値を版の設定に変換する', () => {
    const parsed = personaConfigFormSchema.parse(
      form({ maxOutputTokens: '1024', providerOptions: '{"effort":"low"}' }),
    )
    expect(parsed.maxOutputTokens).toBe(1024)
    expect(parsed.providerOptions).toEqual({ effort: 'low' })
  })

  it('空のオプションは {} にする', () => {
    expect(personaConfigFormSchema.parse(form({ providerOptions: '  ' })).providerOptions).toEqual(
      {},
    )
  })

  it('オブジェクトでない JSON や壊れた JSON はエラーにする', () => {
    expect(personaConfigFormSchema.safeParse(form({ providerOptions: '[1]' })).success).toBe(false)
    expect(personaConfigFormSchema.safeParse(form({ providerOptions: '{' })).success).toBe(false)
  })

  it('空のシステムプロンプトや整数でないトークン数はエラーにする', () => {
    expect(personaConfigFormSchema.safeParse(form({ systemPrompt: ' ' })).success).toBe(false)
    expect(personaConfigFormSchema.safeParse(form({ maxOutputTokens: '1.5' })).success).toBe(false)
  })
})

describe('isSameConfig', () => {
  it('オプションのキーの順番だけが違うなら同じとみなす', () => {
    const a = { ...config, providerOptions: { a: 1, b: { c: 2, d: 3 } } }
    const b = { ...config, providerOptions: { b: { d: 3, c: 2 }, a: 1 } }
    expect(isSameConfig(a, b)).toBe(true)
  })

  it('中身が違えば違うとみなす', () => {
    expect(isSameConfig(config, { ...config, model: 'gemini-pro-latest' })).toBe(false)
  })
})

describe('diffConfigs', () => {
  it('変わったセクションだけ changed になる', () => {
    const sections = diffConfigs(config, { ...config, systemPrompt: '博多弁で話す\n短く返す' })
    expect(sections.map((s) => [s.label, s.changed])).toEqual([
      ['システムプロンプト', true],
      ['会話例', false],
      ['モデルの設定', false],
    ])
    expect(sections[0].parts).toEqual([
      { kind: 'same', text: '博多弁で話す\n' },
      { kind: 'added', text: '短く返す\n' },
    ])
  })
})
