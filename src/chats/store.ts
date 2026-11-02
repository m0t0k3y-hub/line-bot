import 'server-only'

import { and, asc, desc, eq, isNull } from 'drizzle-orm'

import { getDb } from '@/db'
import { type Chat, chats, dailyUsage, personas, settings } from '@/db/schema'
import { jstDate } from './settings'

/** トーク・グループの一覧。割り当てたペルソナの名前と、今日の返信数を付ける */
export async function listChats() {
  const rows = await getDb()
    .select({
      chat: chats,
      personaName: personas.name,
      personaArchived: personas.archivedAt,
      todayCount: dailyUsage.replyCount,
    })
    .from(chats)
    .leftJoin(personas, eq(personas.id, chats.personaId))
    .leftJoin(dailyUsage, and(eq(dailyUsage.chatId, chats.id), eq(dailyUsage.date, jstDate())))
    .orderBy(desc(chats.active), desc(chats.updatedAt))

  return rows.map((row) => ({
    ...row.chat,
    personaName: row.personaName,
    personaArchived: row.personaArchived !== null,
    todayCount: row.todayCount ?? 0,
  }))
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
  values: Omit<
    typeof settings.$inferInsert,
    'id' | 'updatedAt' | 'feedbackAckEnabled' | 'feedbackAckMessage'
  >,
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
