import { describe, expect, it } from 'vitest'

import { getEnv } from './env'

describe('getEnv', () => {
  it('必要な変数がそろっていれば値を返す', () => {
    const env = getEnv({ DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' })
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db')
  })

  it('足りない変数があれば名前を含むエラーを投げる', () => {
    expect(() => getEnv({})).toThrow('DATABASE_URL')
  })
})
