import { validateSignature, type webhook } from '@line/bot-sdk'
import { after } from 'next/server'

import { handleEvent } from '@/bot/handle-event'
import { getEnv } from '@/lib/env'

// LLM の時間切れ（初期値 30 秒）より長くする
export const maxDuration = 60

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-line-signature') ?? ''
  if (!validateSignature(body, getEnv().LINE_CHANNEL_SECRET, signature)) {
    return new Response('invalid signature', { status: 401 })
  }

  const { events } = JSON.parse(body) as webhook.CallbackRequest

  // LINE にはすぐ 200 を返し、返信の生成は応答の後で行う
  after(async () => {
    for (const event of events) {
      try {
        await handleEvent(event)
      } catch (error) {
        console.error('failed to handle LINE event', {
          webhookEventId: event.webhookEventId,
          error,
        })
      }
    }
  })

  return new Response('ok')
}
