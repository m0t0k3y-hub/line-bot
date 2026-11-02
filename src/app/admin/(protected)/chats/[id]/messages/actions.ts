'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/admin/auth'
import {
  deleteAdminFeedback,
  deleteAllMessages,
  deleteMessage,
  deleteMessagesInRange,
  isRatableMessage,
  saveAdminFeedback,
} from '@/feedbacks/store'

export type ActionState = { error?: string; success?: string }

export async function rateMessageAction(input: {
  messageId: string
  rating: 1 | -1
  comment: string
}): Promise<ActionState> {
  const admin = await requireAdmin()

  if (input.rating !== 1 && input.rating !== -1) return { error: '評価が正しくありません' }
  if (!(await isRatableMessage(input.messageId))) return { error: '評価できない返答です' }

  await saveAdminFeedback({
    messageId: input.messageId,
    adminId: admin.id,
    rating: input.rating,
    comment: input.comment.trim().slice(0, 1000),
  })
  refresh()
  return {}
}

export async function removeMyRatingAction(messageId: string): Promise<void> {
  const admin = await requireAdmin()
  await deleteAdminFeedback(messageId, admin.id)
  refresh()
}

export async function deleteMessageAction(chatId: string, messageId: string): Promise<void> {
  await requireAdmin()
  await deleteMessage(chatId, messageId)
  refresh()
}

const dateSchema = z.iso.date('日付を選んでください')

export async function deleteMessagesInRangeAction(
  chatId: string,
  from: string,
  to: string,
): Promise<ActionState> {
  await requireAdmin()

  const range = z.object({ from: dateSchema, to: dateSchema }).safeParse({ from, to })
  if (!range.success) return { error: '開始日と終了日を選んでください' }
  if (range.data.from > range.data.to) return { error: '開始日は終了日より前にしてください' }

  const deleted = await deleteMessagesInRange(chatId, range.data.from, range.data.to)
  refresh()
  return { success: `${deleted} 件のログを削除しました` }
}

export async function deleteAllMessagesAction(chatId: string): Promise<ActionState> {
  await requireAdmin()
  const deleted = await deleteAllMessages(chatId)
  refresh()
  return { success: `${deleted} 件のログを削除しました` }
}
