import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/admin/auth'
import { getChat } from '@/chats/store'
import { formatTranscript } from '@/chats/transcript'
import { listTranscriptMessages } from '@/feedbacks/store'

// 空欄はその端を指定しない
const optionalDate = z.union([z.literal('').transform(() => undefined), z.iso.date()]).optional()

/** 会話ログをテキストで返す（docs/spec.md「5.8」）。?from=YYYY-MM-DD&to=YYYY-MM-DD で期間を指定する */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/admin/chats/[id]/messages/export'>,
) {
  await requireAdmin()
  const { id } = await ctx.params

  const range = z.object({ from: optionalDate, to: optionalDate }).safeParse({
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    to: request.nextUrl.searchParams.get('to') ?? undefined,
  })
  if (!range.success) return textResponse('日付の形式が正しくありません', 400)
  const { from, to } = range.data
  if (from && to && from > to) return textResponse('開始日は終了日より前にしてください', 400)

  const chat = await getChat(id)
  if (!chat) return textResponse('トークが見つかりません', 404)

  const messages = await listTranscriptMessages(id, from, to)
  return textResponse(formatTranscript({ chatName: chat.name, from, to, messages }))
}

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
