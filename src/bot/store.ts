import { and, desc, eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import {
  type Chat,
  chats,
  dailyUsage,
  lineUsers,
  messages,
  personas,
  personaVersions,
  settings,
  webhookEvents,
} from '@/db/schema'

/** 初めて見るイベントなら true。再送されたイベントなら false */
export async function markEventProcessed(webhookEventId: string): Promise<boolean> {
  const inserted = await getDb()
    .insert(webhookEvents)
    .values({ webhookEventId })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.webhookEventId })
  return inserted.length > 0
}

export async function upsertChat(values: {
  lineChatId: string
  type: Chat['type']
  name?: string
}): Promise<Chat> {
  const [chat] = await getDb()
    .insert(chats)
    .values(values)
    .onConflictDoUpdate({
      target: chats.lineChatId,
      set: { active: true, ...(values.name !== undefined && { name: values.name }) },
    })
    .returning()
  return chat
}

export async function deactivateChat(lineChatId: string): Promise<void> {
  await getDb().update(chats).set({ active: false }).where(eq(chats.lineChatId, lineChatId))
}

export async function getSettings() {
  const db = getDb()
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  if (row) return row

  // 初期データを入れる前でも動くように、既定値の行を作る
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning()
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0]
}

export async function getCurrentPersonaVersion(personaId: string) {
  const [row] = await getDb()
    .select({ version: personaVersions })
    .from(personas)
    .innerJoin(personaVersions, eq(personaVersions.id, personas.currentVersionId))
    .where(eq(personas.id, personaId))
  return row?.version
}

export async function saveMessage(values: typeof messages.$inferInsert): Promise<void> {
  await getDb().insert(messages).values(values)
}

/** 履歴に使うメッセージを新しい順に返す */
export async function getRecentChatMessages(chatId: string, limit: number) {
  return getDb()
    .select({ role: messages.role, text: messages.text, speaker: lineUsers.displayName })
    .from(messages)
    .leftJoin(lineUsers, eq(lineUsers.lineUserId, messages.lineUserId))
    .where(and(eq(messages.chatId, chatId), eq(messages.kind, 'chat')))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
}

const DISPLAY_NAME_TTL_MS = 24 * 60 * 60 * 1000

export async function getCachedDisplayName(lineUserId: string): Promise<string | undefined> {
  const [row] = await getDb().select().from(lineUsers).where(eq(lineUsers.lineUserId, lineUserId))
  if (!row || Date.now() - row.updatedAt.getTime() > DISPLAY_NAME_TTL_MS) return undefined
  return row.displayName
}

export async function saveDisplayName(lineUserId: string, displayName: string): Promise<void> {
  await getDb()
    .insert(lineUsers)
    .values({ lineUserId, displayName })
    .onConflictDoUpdate({
      target: lineUsers.lineUserId,
      set: { displayName, updatedAt: new Date() },
    })
}

export async function getReplyCount(chatId: string, date: string): Promise<number> {
  const [row] = await getDb()
    .select({ replyCount: dailyUsage.replyCount })
    .from(dailyUsage)
    .where(and(eq(dailyUsage.chatId, chatId), eq(dailyUsage.date, date)))
  return row?.replyCount ?? 0
}

export async function incrementReplyCount(chatId: string, date: string): Promise<void> {
  await getDb()
    .insert(dailyUsage)
    .values({ chatId, date, replyCount: 1 })
    .onConflictDoUpdate({
      target: [dailyUsage.chatId, dailyUsage.date],
      set: { replyCount: sql`${dailyUsage.replyCount} + 1` },
    })
}
