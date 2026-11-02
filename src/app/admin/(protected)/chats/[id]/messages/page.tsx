import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireAdmin } from '@/admin/auth'
import { hintClass } from '@/app/admin/ui'
import { jstDate } from '@/chats/settings'
import { getChat } from '@/chats/store'
import { listChatMessages, MESSAGES_PAGE_SIZE } from '@/feedbacks/store'
import { BulkDeletePanel, DeleteMessageButton, RateControls } from './message-controls'

export const instant = false

const timeFormat = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tokyo',
})

const kindLabels = {
  feedback: '評価',
  limit_notice: '上限の通知',
  error: 'エラー',
} as const

export default async function MessagesPage({
  params,
  searchParams,
}: PageProps<'/admin/chats/[id]/messages'>) {
  const admin = await requireAdmin()
  const { id } = await params
  const { before } = await searchParams
  const beforeDate = typeof before === 'string' && before ? new Date(before) : undefined

  const chat = await getChat(id)
  if (!chat) notFound()
  const messages = await listChatMessages(
    id,
    beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : undefined,
  )
  const oldest = messages.at(-1)

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <Link href={`/admin/chats/${id}`} className="text-sm hover:underline">
          ← {chat.name || '（名前なし）'} の設定
        </Link>
        <h1 className="text-xl font-semibold">会話ログ：{chat.name || '（名前なし）'}</h1>
        <p className={hintClass}>
          新しい順に表示しています。Bot の返答には、管理者として評価を付けられます。
        </p>
      </div>

      <BulkDeletePanel chatId={id} today={jstDate()} />

      {beforeDate && (
        <Link href={`/admin/chats/${id}/messages`} className="text-sm hover:underline">
          最新のログに戻る
        </Link>
      )}

      <ul className="space-y-3">
        {messages.map((message) => {
          const isBot = message.role === 'assistant'
          const mine = message.feedbacks.find((f) => f.adminId === admin.id)
          return (
            <li
              key={message.id}
              className={`rounded-lg border p-3 ${
                isBot
                  ? 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {isBot ? 'Bot' : message.speaker || '（名前不明）'}
                </span>
                <span>{timeFormat.format(message.createdAt)}</span>
                {message.kind !== 'chat' && (
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">
                    {kindLabels[message.kind]}
                  </span>
                )}
                {isBot && message.persona && <span>{message.persona}</span>}
                {isBot && message.model && <span>{message.model}</span>}
                {isBot && message.outputTokens !== null && (
                  <span>
                    入力 {message.inputTokens} / 出力 {message.outputTokens} トークン・
                    {((message.latencyMs ?? 0) / 1000).toFixed(1)} 秒
                  </span>
                )}
                <span className="ml-auto">
                  <DeleteMessageButton chatId={id} messageId={message.id} />
                </span>
              </div>

              <p className="mt-1 text-sm whitespace-pre-wrap">{message.text}</p>
              {message.error && (
                <p className="mt-1 text-xs whitespace-pre-wrap text-red-600">{message.error}</p>
              )}

              {message.feedbacks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {message.feedbacks.map((feedback) => (
                    <li key={feedback.id} className="text-sm">
                      {feedback.rating > 0 ? '👍' : '👎'}{' '}
                      <span className={hintClass}>
                        {feedback.rater}
                        {feedback.source === 'admin' ? '（管理者）' : '（LINE）'}
                      </span>
                      {feedback.comment && <span className="ml-2">{feedback.comment}</span>}
                    </li>
                  ))}
                </ul>
              )}

              {isBot && message.kind === 'chat' && (
                <RateControls
                  // 評価が変わったら入力欄を作り直す
                  key={`${mine?.rating}-${mine?.comment}`}
                  messageId={message.id}
                  mine={mine}
                />
              )}
            </li>
          )
        })}
      </ul>

      {messages.length === 0 && <p className={hintClass}>ログはありません。</p>}
      {messages.length === MESSAGES_PAGE_SIZE && oldest && (
        <Link
          href={`/admin/chats/${id}/messages?before=${encodeURIComponent(oldest.createdAt.toISOString())}`}
          className="text-sm hover:underline"
        >
          さらに古いログを見る
        </Link>
      )}
    </div>
  )
}
