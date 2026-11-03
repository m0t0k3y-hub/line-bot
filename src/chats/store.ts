import 'server-only'

import { and, asc, count, desc, eq, isNull, max } from 'drizzle-orm'

import { getDb } from '@/db'
import { type Chat, chats, dailyUsage, messages, personas, settings } from '@/db/schema'
import { jstDate } from './settings'

/**
 * トーク・グループの一覧。割り当てたペルソナの名前、今日の返信数、会話のメッセージ数、最後のやり取りを付ける。
 * 有効なチャットを先にし、その中で最後のやり取りが新しい順に並べる（docs/spec.md「5.8」）
 */
export async function listChats() {
  const db = getDb()
  const [rows, stats] = await Promise.all([
    db
      .select({
        chat: chats,
        personaName: personas.name,
        personaArchived: personas.archivedAt,
        todayCount: dailyUsage.replyCount,
      })
      .from(chats)
      .leftJoin(personas, eq(personas.id, chats.personaId))
      .leftJoin(dailyUsage, and(eq(dailyUsage.chatId, chats.id), eq(dailyUsage.date, jstDate())))
      .orderBy(desc(chats.active), desc(chats.updatedAt)),
    db
      .select({
        chatId: messages.chatId,
        messageCount: count(),
        lastMessageAt: max(messages.createdAt),
      })
      .from(messages)
      .where(eq(messages.kind, 'chat'))
      .groupBy(messages.chatId),
  ])
  const statsByChat = new Map(stats.map((row) => [row.chatId, row]))

  return rows
    .map((row) => ({
      ...row.chat,
      personaName: row.personaName,
      personaArchived: row.personaArchived !== null,
      todayCount: row.todayCount ?? 0,
      messageCount: statsByChat.get(row.chat.id)?.messageCount ?? 0,
      lastMessageAt: statsByChat.get(row.chat.id)?.lastMessageAt ?? null,
    }))
    .sort(
      // やり取りがないチャットは最後に置く。同じなら DB の並び（更新が新しい順）のまま
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0),
    )
}

export async function getChat(id: string) {
  const [row] = await getDb()
    .select({ chat: chats, todayCount: dailyUsage.replyCount })
    .from(chats)
    .leftJoin(dailyUsage, and(eq(dailyUsage.chatId, chats.id), eq(dailyUsage.date, jstDate())))
    .where(eq(chats.id, id))
  return row && { ...row.chat, todayCount: row.todayCount ?? 0 }
}

export async function updateChatSettings(
  id: string,
  values: Pick<
    Chat,
    | 'personaId'
    | 'replyMode'
    | 'keywords'
    | 'historyTurns'
    | 'historyMaxMessages'
    | 'dailyLimit'
    | 'limitMessage'
  >,
): Promise<void> {
  await getDb().update(chats).set(values).where(eq(chats.id, id))
}

export async function updateGlobalSettings(
  values: Omit<typeof settings.$inferInsert, 'id' | 'updatedAt'>,
): Promise<void> {
  await getDb()
    .insert(settings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: settings.id, set: values })
}

/** 選べるペルソナ（削除済みを除く） */
export async function listPersonaOptions() {
  return getDb()
    .select({ id: personas.id, name: personas.name })
    .from(personas)
    .where(isNull(personas.archivedAt))
    .orderBy(asc(personas.createdAt))
}
