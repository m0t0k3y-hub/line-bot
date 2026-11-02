import { describe, expect, it } from 'vitest'

import { getEnv } from './env'

const required = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  LINE_CHANNEL_SECRET: 'secret',
  LINE_CHANNEL_ACCESS_TOKEN: 'token',
}

describe('getEnv', () => {
  it('必要な変数がそろっていれば値を返す', () => {
    const env = getEnv(required)
    expect(env.DATABASE_URL).toBe(required.DATABASE_URL)
    expect(env.GOOGLE_GENERATIVE_AI_API_KEY).toBeUndefined()
  })

  it('API キーの空文字は未設定として扱う', () => {
    expect(getEnv({ ...required, OPENAI_API_KEY: '' }).OPENAI_API_KEY).toBeUndefined()
  })

  it('足りない変数があれば名前を含むエラーを投げる', () => {
    expect(() => getEnv({ DATABASE_URL: required.DATABASE_URL })).toThrow(
      'LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN',
    )
  })
})
