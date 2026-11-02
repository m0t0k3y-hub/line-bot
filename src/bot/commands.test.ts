import { describe, expect, it } from 'vitest'

import { parseCommand } from './commands'

describe('parseCommand', () => {
  it('/ で始まればコマンド名と引数に分ける', () => {
    expect(parseCommand('/reset')).toEqual({ name: 'reset', args: '' })
    expect(parseCommand('  /Persona 博多  ')).toEqual({ name: 'persona', args: '博多' })
  })

  it('/ で始まらなければ null', () => {
    expect(parseCommand('こんにちは')).toBeNull()
    expect(parseCommand('a/b')).toBeNull()
    expect(parseCommand('/')).toBeNull()
  })
})
