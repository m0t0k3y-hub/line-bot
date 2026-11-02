import 'server-only'

import { and, count, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm'

import { jstDate } from '@/chats/settings'
import { getDb } from '@/db'
import {
  admins,
  chats,
  dailyUsage,
  feedbacks,
  lineUsers,
  messages,
  personas,
  personaVersions,
} from '@/db/schema'

/** 日本時間の日付（YYYY-MM-DD）の 0:00 */
export function startOfJstDay(date: string): Date {
  return new Date(`${date}T00:00:00+09:00`)
}

function nextJstDay(date: string): Date {
  return new Date(startOfJstDay(date).getTime() + 24 * 60 * 60 * 1000)
}

// ---- 会話ログ ----

export const MESSAGES_PAGE_SIZE = 100

/** チャットの会話ログ（新しい順）。before より前を最大 100 件返す */
export async function listChatMessages(chatId: string, before?: Date) {
  const db = getDb()
  const conditions: SQL[] = [eq(messages.chatId, chatId)]
  if (before) conditions.push(lt(messages.createdAt, before))

  const rows = await db
    .select({
      message: messages,
      speaker: lineUsers.displayName,
      personaName: personas.name,
      versionNo: personaVersions.versionNo,
    })
    .from(messages)
    .leftJoin(lineUsers, eq(lineUsers.lineUserId, messages.lineUserId))
    .leftJoin(personaVersions, eq(personaVersions.id, messages.personaVersionId))
    .leftJoin(personas, eq(personas.id, personaVersions.personaId))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGES_PAGE_SIZE)

  const ids = rows.map((row) => row.message.id)
  const feedbackRows =
    ids.length === 0
      ? []
      : await db
          .select({
            feedback: feedbacks,
            raterLine: lineUsers.displayName,
            raterAdmin: admins.name,
            raterAdminEmail: admins.email,
          })
          .from(feedbacks)
          .leftJoin(lineUsers, eq(lineUsers.lineUserId, feedbacks.lineUserId))
          .leftJoin(admins, eq(admins.id, feedbacks.adminId))
          .where(inArray(feedbacks.messageId, ids))
          .orderBy(feedbacks.createdAt)

  const feedbacksByMessage = Map.groupBy(
    feedbackRows.map((row) => ({
      ...row.feedback,
      rater:
        row.feedback.source === 'admin'
          ? row.raterAdmin || row.raterAdminEmail || '管理者'
          : row.raterLine || 'LINE ユーザー',
    })),
    (feedback) => feedback.messageId,
  )

  return rows.map((row) => ({
    ...row.message,
    speaker: row.speaker,
    persona: row.personaName ? `${row.personaName} 版${row.versionNo}` : null,
    feedbacks: feedbacksByMessage.get(row.message.id) ?? [],
  }))
}

export async function deleteMessage(chatId: string, messageId: string): Promise<void> {
  await getDb()
    .delete(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.id, messageId)))
}

/** 期間（日本時間の日付、両端を含む）のログを消す。消した件数を返す */
export async function deleteMessagesInRange(
  chatId: string,
  from: string,
  to: string,
): Promise<number> {
  const deleted = await getDb()
    .delete(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        gte(messages.createdAt, startOfJstDay(from)),
        lt(messages.createdAt, nextJstDay(to)),
      ),
    )
    .returning({ id: messages.id })
  return deleted.length
}

export async function deleteAllMessages(chatId: string): Promise<number> {
  const deleted = await getDb()
    .delete(messages)
    .where(eq(messages.chatId, chatId))
    .returning({ id: messages.id })
  return deleted.length
}

// ---- 評価 ----

/** 管理者の評価。同じ管理者が評価し直したら上書きする */
export async function saveAdminFeedback(values: {
  messageId: string
  adminId: string
  rating: number
  comment: string
}): Promise<void> {
  await getDb()
    .insert(feedbacks)
    .values({ ...values, source: 'admin' })
    .onConflictDoUpdate({
      target: [feedbacks.messageId, feedbacks.adminId],
      set: { rating: values.rating, comment: values.comment, updatedAt: new Date() },
    })
}

export async function deleteAdminFeedback(messageId: string, adminId: string): Promise<void> {
  await getDb()
    .delete(feedbacks)
    .where(and(eq(feedbacks.messageId, messageId), eq(feedbacks.adminId, adminId)))
}

/** 評価を付けられる返答か（Bot の通常の返答だけ） */
export async function isRatableMessage(messageId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(eq(messages.id, messageId), eq(messages.role, 'assistant'), eq(messages.kind, 'chat')),
    )
  return row !== undefined
}

export type FeedbackFilters = {
  personaId?: string
  versionId?: string
  model?: string
  rating?: 1 | -1
}

/** 評価の一覧（新しい順、最大 200 件） */
export async function listFeedbacks(filters: FeedbackFilters) {
  const conditions: SQL[] = []
  if (filters.personaId) conditions.push(eq(personas.id, filters.personaId))
  if (filters.versionId) conditions.push(eq(personaVersions.id, filters.versionId))
  if (filters.model) conditions.push(eq(messages.model, filters.model))
  if (filters.rating) conditions.push(eq(feedbacks.rating, filters.rating))

  const rows = await getDb()
    .select({
      feedback: feedbacks,
      replyText: messages.text,
      model: messages.model,
      chatId: chats.id,
      chatName: chats.name,
      personaName: personas.name,
      versionNo: personaVersions.versionNo,
      raterLine: lineUsers.displayName,
      raterAdmin: admins.name,
      raterAdminEmail: admins.email,
    })
    .from(feedbacks)
    .innerJoin(messages, eq(messages.id, feedbacks.messageId))
    .innerJoin(chats, eq(chats.id, messages.chatId))
    .leftJoin(personaVersions, eq(personaVersions.id, messages.personaVersionId))
    .leftJoin(personas, eq(personas.id, personaVersions.personaId))
    .leftJoin(lineUsers, eq(lineUsers.lineUserId, feedbacks.lineUserId))
    .leftJoin(admins, eq(admins.id, feedbacks.adminId))
    .where(and(...conditions))
    .orderBy(desc(feedbacks.createdAt))
    .limit(200)

  return rows.map((row) => ({
    ...row.feedback,
    replyText: row.replyText,
    model: row.model,
    chatId: row.chatId,
    chatName: row.chatName,
    persona: row.personaName ? `${row.personaName} 版${row.versionNo}` : null,
    rater:
      row.feedback.source === 'admin'
        ? row.raterAdmin || row.raterAdminEmail || '管理者'
        : row.raterLine || 'LINE ユーザー',
  }))
}

/** 絞り込みの選択肢に使う、返答に使われたモデルの一覧 */
export async function listUsedModels(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ model: messages.model })
    .from(messages)
    .where(eq(messages.role, 'assistant'))
  return rows
    .map((row) => row.model)
    .filter((model): model is string => model !== null)
    .sort()
}

/** 版ごとの評価の数 */
export async function getVersionFeedbackStats(
  versionIds: string[],
): Promise<Map<string, { up: number; down: number }>> {
  if (versionIds.length === 0) return new Map()
  const rows = await getDb()
    .select({
      versionId: messages.personaVersionId,
      up: sql<number>`count(*) filter (where ${feedbacks.rating} > 0)`.mapWith(Number),
      down: sql<number>`count(*) filter (where ${feedbacks.rating} < 0)`.mapWith(Number),
    })
    .from(feedbacks)
    .innerJoin(messages, eq(messages.id, feedbacks.messageId))
    .where(inArray(messages.personaVersionId, versionIds))
    .groupBy(messages.personaVersionId)
  return new Map(rows.map((row) => [row.versionId ?? '', { up: row.up, down: row.down }]))
}

// ---- ダッシュボード ----

export async function getDashboardStats() {
  const db = getDb()
  const today = jstDate()
  const since = startOfJstDay(today)

  const [usage, [errors], [todayFeedbacks]] = await Promise.all([
    db
      .select({ chatId: chats.id, chatName: chats.name, replyCount: dailyUsage.replyCount })
      .from(dailyUsage)
      .innerJoin(chats, eq(chats.id, dailyUsage.chatId))
      .where(eq(dailyUsage.date, today))
      .orderBy(desc(dailyUsage.replyCount)),
    db
      .select({ value: count() })
      .from(messages)
      .where(and(eq(messages.kind, 'error'), gte(messages.createdAt, since))),
    db
      .select({
        up: sql<number>`count(*) filter (where ${feedbacks.rating} > 0)`.mapWith(Number),
        down: sql<number>`count(*) filter (where ${feedbacks.rating} < 0)`.mapWith(Number),
      })
      .from(feedbacks)
      .where(gte(feedbacks.createdAt, since)),
  ])

  return {
    replyTotal: usage.reduce((sum, row) => sum + row.replyCount, 0),
    usageByChat: usage,
    errorCount: errors.value,
    feedbacks: todayFeedbacks,
  }
}
