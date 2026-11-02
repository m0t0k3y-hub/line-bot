import type { webhook } from '@line/bot-sdk'

import { jstDate, resolveChatSettings } from '@/chats/settings'
import type { Chat } from '@/db/schema'
import { getLineClient, replyText } from '@/lib/line'
import { generateReply } from '@/llm'
import { findCommand, parseCommand } from './commands'
import { parseFeedback } from './feedback'
import { buildInstructions, cleanReply } from './context'
import { buildHistory } from './history'
import { shouldReply, stripBotMentions } from './reply-rule'
import {
  deactivateChat,
  findFeedbackTarget,
  getCachedDisplayName,
  getCurrentPersonaVersion,
  getRecentChatMessages,
  getReplyCount,
  getSettings,
  incrementReplyCount,
  markEventProcessed,
  saveDisplayName,
  saveLineFeedback,
  saveMessage,
  upsertChat,
} from './store'

/** イベントの送信元を、このアプリのチャットの単位に直したもの */
type ChatSource = { lineChatId: string; type: Chat['type']; userId: string | undefined }

function toChatSource(source: webhook.Source | undefined): ChatSource | undefined {
  switch (source?.type) {
    case 'user':
      return source.userId
        ? { lineChatId: source.userId, type: 'user', userId: source.userId }
        : undefined
    case 'group':
      return { lineChatId: source.groupId, type: 'group', userId: source.userId }
    case 'room':
      return { lineChatId: source.roomId, type: 'room', userId: source.userId }
    default:
      return undefined
  }
}

// 処理の流れは docs/spec.md「4.2 メッセージ処理の流れ」を参照
export async function handleEvent(event: webhook.Event): Promise<void> {
  if (!(await markEventProcessed(event.webhookEventId))) return

  const source = toChatSource(event.source)
  if (!source) return

  switch (event.type) {
    case 'follow':
    case 'join':
      await upsertChat({
        lineChatId: source.lineChatId,
        type: source.type,
        name: await resolveChatName(source),
      })
      return
    case 'unfollow':
    case 'leave':
      await deactivateChat(source.lineChatId)
      return
    case 'message':
      if (event.message.type !== 'text') return
      await handleText(source, event.message, event.replyToken)
      return
  }
}

async function resolveDisplayName(source: ChatSource, userId: string): Promise<string> {
  const cached = await getCachedDisplayName(userId)
  if (cached) return cached

  try {
    const client = getLineClient()
    const profile =
      source.type === 'group'
        ? await client.getGroupMemberProfile(source.lineChatId, userId)
        : source.type === 'room'
          ? await client.getRoomMemberProfile(source.lineChatId, userId)
          : await client.getProfile(userId)
    await saveDisplayName(userId, profile.displayName)
    return profile.displayName
  } catch (error) {
    console.warn('failed to fetch LINE profile', error)
    return ''
  }
}

/** 1対1なら相手の表示名、グループならグループ名。複数人トークには名前がない */
async function resolveChatName(source: ChatSource): Promise<string | undefined> {
  switch (source.type) {
    case 'user':
      return source.userId ? await resolveDisplayName(source, source.userId) : undefined
    case 'group':
      try {
        return (await getLineClient().getGroupSummary(source.lineChatId)).groupName
      } catch (error) {
        console.warn('failed to fetch LINE group summary', error)
        return undefined
      }
    case 'room':
      return undefined
  }
}

async function handleText(
  source: ChatSource,
  message: webhook.TextMessageContent,
  replyToken: string | undefined,
): Promise<void> {
  const { userId } = source
  // 履歴の話者名に使うため、発言者の表示名を先にキャッシュしておく
  const speakerName = userId ? await resolveDisplayName(source, userId) : ''

  let chat = await upsertChat({
    lineChatId: source.lineChatId,
    type: source.type,
    ...(source.type === 'user' && { name: speakerName }),
  })
  // 参加時にグループ名を取れなかった場合（フェーズ1以前から参加していた場合など）に補う
  if (source.type === 'group' && !chat.name) {
    const name = await resolveChatName(source)
    if (name) chat = await upsertChat({ lineChatId: source.lineChatId, type: source.type, name })
  }

  const text = stripBotMentions(message.text, message.mention)

  // 評価（docs/spec.md「4.6」）。返信条件に関係なく受け付け、LLM には渡さない
  const feedback = parseFeedback(text)
  const feedbackTarget = feedback && (await findFeedbackTarget(chat.id, message.quotedMessageId))
  if (feedback && feedbackTarget) {
    await saveLineFeedback({ messageId: feedbackTarget.id, ...feedback, lineUserId: userId })
    // ログには残すが、kind=feedback なので会話の履歴には含めない
    await saveMessage({
      chatId: chat.id,
      role: 'user',
      kind: 'feedback',
      lineMessageId: message.id,
      lineUserId: userId,
      text,
    })

    const settings = await getSettings()
    if (replyToken && settings.feedbackAckEnabled) {
      const sentId = await replyText(replyToken, settings.feedbackAckMessage)
      await saveMessage({
        chatId: chat.id,
        role: 'assistant',
        kind: 'feedback',
        lineMessageId: sentId,
        text: settings.feedbackAckMessage,
      })
    }
    return
  }

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

  // Bot が返信しない発言も、会話の記憶のために保存する
  await saveMessage({
    chatId: chat.id,
    role: 'user',
    lineMessageId: message.id,
    lineUserId: userId,
    text,
  })

  if (!replyToken || !shouldReply(chat, { text: message.text, mention: message.mention })) return
  await replyWithPersona(chat, replyToken)
}

async function replyWithPersona(chat: Chat, replyToken: string) {
  const settings = await getSettings()
  const resolved = resolveChatSettings(chat, settings)
  const version = resolved.personaId
    ? await getCurrentPersonaVersion(resolved.personaId)
    : undefined
  if (!version) {
    console.warn('no persona is assigned', { chatId: chat.id })
    return
  }

  // 回数制限（docs/spec.md「4.5」）。上限時の定型文は回数に数えない
  const today = jstDate()
  if ((await getReplyCount(chat.id, today)) >= resolved.dailyLimit) {
    const sentId = await replyText(replyToken, resolved.limitMessage)
    await saveMessage({
      chatId: chat.id,
      role: 'assistant',
      kind: 'limit_notice',
      lineMessageId: sentId,
      text: resolved.limitMessage,
    })
    return
  }

  // ローディング表示は1対1のトークでしか使えない
  if (chat.type === 'user') void showLoading(chat.lineChatId, settings.llmTimeoutSec)

  const history = buildHistory(await getRecentChatMessages(chat.id, resolved.historyMaxMessages), {
    turns: resolved.historyTurns,
    maxMessages: resolved.historyMaxMessages,
    withSpeakers: chat.type !== 'user',
  })

  const personaColumns = {
    personaVersionId: version.id,
    provider: version.provider,
    model: version.model,
  }

  try {
    const reply = await generateReply(
      { ...version, systemPrompt: buildInstructions(version.systemPrompt, chat) },
      history,
      { timeoutMs: settings.llmTimeoutSec * 1000 },
    )
    const text = cleanReply(reply.text)
    const sentId = await replyText(replyToken, text)
    await saveMessage({
      chatId: chat.id,
      role: 'assistant',
      lineMessageId: sentId,
      text,
      ...personaColumns,
      inputTokens: reply.inputTokens,
      outputTokens: reply.outputTokens,
      latencyMs: reply.latencyMs,
    })
    // エラーになった返答は回数に数えない
    await incrementReplyCount(chat.id, today)
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
