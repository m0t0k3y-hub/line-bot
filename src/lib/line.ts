import { messagingApi } from '@line/bot-sdk'

import { getEnv } from '@/lib/env'

let client: messagingApi.MessagingApiClient | undefined

export function getLineClient() {
  client ??= new messagingApi.MessagingApiClient({
    channelAccessToken: getEnv().LINE_CHANNEL_ACCESS_TOKEN,
  })
  return client
}

// LINE のテキストメッセージは1通あたり最大 5,000 文字
const MAX_TEXT_LENGTH = 5000

/** 返信して、LINE が採番した送信メッセージ ID を返す */
export async function replyText(replyToken: string, text: string): Promise<string | undefined> {
  const response = await getLineClient().replyMessage({
    replyToken,
    messages: [{ type: 'text', text: text.slice(0, MAX_TEXT_LENGTH) }],
  })
  return response.sentMessages[0]?.id
}
