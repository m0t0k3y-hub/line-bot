import type { webhook } from '@line/bot-sdk'

import type { Chat } from '@/db/schema'
import { getLineClient, replyText } from '@/lib/line'
import { generateReply } from '@/llm'
import { findCommand, parseCommand } from './commands'
import { buildHistory } from './history'
import {
  deactivateChat,
  getCachedDisplayName,
  getCurrentPersonaVersion,
  getRecentChatMessages,
  getSettings,
  markEventProcessed,
  saveDisplayName,
  saveMessage,
  upsertChat,
} from './store'

// 処理の流れは docs/spec.md「4.2 メッセージ処理の流れ」を参照
export async function handleEvent(event: webhook.Event): Promise<void> {
  if (!(await markEventProcessed(event.webhookEventId))) return

  switch (event.type) {
    case 'follow':
      if (event.source?.type === 'user' && event.source.userId) {
        const userId = event.source.userId
        await upsertChat({
          lineChatId: userId,
          type: 'user',
          name: await resolveDisplayName(userId),
        })
      }
      return
    case 'unfollow':
      if (event.source?.type === 'user' && event.source.userId) {
        await deactivateChat(event.source.userId)
      }
      return
    case 'message':
      // グループとテキスト以外のメッセージはフェーズ2以降で扱う
      if (event.message.type !== 'text' || event.source?.type !== 'user') return
      if (!event.source.userId) return
      await handleUserText({
        userId: event.source.userId,
        text: event.message.text,
        messageId: event.message.id,
        replyToken: event.replyToken,
      })
      return
  }
}

async function resolveDisplayName(userId: string): Promise<string> {
  const cached = await getCachedDisplayName(userId)
  if (cached) return cached

  try {
    const profile = await getLineClient().getProfile(userId)
    await saveDisplayName(userId, profile.displayName)
    return profile.displayName
  } catch (error) {
    console.warn('failed to fetch LINE profile', error)
    return ''
  }
}

async function handleUserText(input: {
  userId: string
  text: string
  messageId: string
  replyToken: string | undefined
}): Promise<void> {
  const { userId, text, replyToken } = input
  const chat = await upsertChat({
    lineChatId: userId,
    type: 'user',
    name: await resolveDisplayName(userId),
  })

  const command = parseCommand(text)
  if (command) {
    // 登録されていないコマンドは何もしない（記録もしない）
    await findCommand(command.name)?.run({
      chat,
      lineUserId: userId,
      args: command.args,
      reply: async (replyMessage) => {
        if (replyToken) await replyText(replyToken, replyMessage)
      },
    })
    return
  }

  await saveMessage({
    chatId: chat.id,
    role: 'user',
    lineMessageId: input.messageId,
    lineUserId: userId,
    text,
  })

  if (!replyToken) return
  await replyWithPersona(chat, userId, replyToken)
}

async function replyWithPersona(chat: Chat, lineChatId: string, replyToken: string) {
  const settings = await getSettings()
  const personaId = chat.personaId ?? settings.defaultPersonaId
  const version = personaId ? await getCurrentPersonaVersion(personaId) : undefined
  if (!version) {
    console.warn('no persona is assigned', { chatId: chat.id })
    return
  }

  void showLoading(lineChatId, settings.llmTimeoutSec)

  const turns = chat.historyTurns ?? settings.historyTurns
  const maxMessages = chat.historyMaxMessages ?? settings.historyMaxMessages
  const history = buildHistory(await getRecentChatMessages(chat.id, maxMessages), {
    turns,
    maxMessages,
  })

  const personaColumns = {
    personaVersionId: version.id,
    provider: version.provider,
    model: version.model,
  }

  try {
    const reply = await generateReply(version, history, {
      timeoutMs: settings.llmTimeoutSec * 1000,
    })
    const sentId = await replyText(replyToken, reply.text)
    await saveMessage({
      chatId: chat.id,
      role: 'assistant',
      lineMessageId: sentId,
      text: reply.text,
      ...personaColumns,
      inputTokens: reply.inputTokens,
      outputTokens: reply.outputTokens,
      latencyMs: reply.latencyMs,
    })
  } catch (error) {
    console.error('failed to generate reply', error)
    const sentId = await replyText(replyToken, settings.errorMessage).catch(() => undefined)
    await saveMessage({
      chatId: chat.id,
      role: 'assistant',
      kind: 'error',
      lineMessageId: sentId,
      text: settings.errorMessage,
      ...personaColumns,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ローディング表示は 5〜60 秒を 5 秒単位で指定する。失敗しても返信は続ける
async function showLoading(chatId: string, timeoutSec: number) {
  const loadingSeconds = Math.min(60, Math.max(5, Math.ceil(timeoutSec / 5) * 5))
  try {
    await getLineClient().showLoadingAnimation({ chatId, loadingSeconds })
  } catch (error) {
    console.warn('failed to show loading animation', error)
  }
}
