import type { Chat } from '@/db/schema'

export type CommandContext = {
  chat: Chat
  lineUserId: string | undefined
  args: string
  reply: (text: string) => Promise<void>
}

export type Command = {
  name: string
  run: (ctx: CommandContext) => Promise<void>
}

// コマンドはここに登録する（例：将来の /reset）。初版では何も登録しない
const registry = new Map<string, Command>()

export function parseCommand(text: string): { name: string; args: string } | null {
  const match = /^\/(\S+)\s*([\s\S]*)$/.exec(text.trim())
  if (!match) return null
  return { name: match[1].toLowerCase(), args: match[2].trim() }
}

export function findCommand(name: string): Command | undefined {
  return registry.get(name)
}
