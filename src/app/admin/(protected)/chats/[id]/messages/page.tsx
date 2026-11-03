import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireAdmin } from '@/admin/auth'
import { hintClass, inputClass, secondaryButtonClass } from '@/app/admin/ui'
import { jstDate } from '@/chats/settings'
import { getChat } from '@/chats/store'
import {
  listChatMessages,
  listMessageDays,
  MESSAGES_PAGE_SIZE,
  nextJstDay,
} from '@/feedbacks/store'
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
  const [messages, days] = await Promise.all([
    listChatMessages(
      id,
      beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : undefined,
    ),
    listMessageDays(id),
  ])
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

      <ExportPanel chatId={id} days={days} />

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

/** 日ごとの件数と、テキストでの書き出し（docs/spec.md「5.8」） */
function ExportPanel({
  chatId,
  days,
}: {
  chatId: string
  days: { date: string; count: number }[]
}) {
  const exportHref = (from?: string, to?: string) =>
    `/admin/chats/${chatId}/messages/export${from ? `?from=${from}&to=${to}` : ''}`

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">日ごとの件数と書き出し</h2>

      {days.length === 0 ? (
        <p className={hintClass}>会話のログはありません。</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {days.map((day) => (
            <li key={day.date} className="flex gap-3">
              <span className="tabular-nums">{day.date}</span>
              <span className="text-zinc-500">{day.count} 件</span>
              <Link
                href={`/admin/chats/${chatId}/messages?before=${encodeURIComponent(nextJstDay(day.date).toISOString())}`}
                className="hover:underline"
              >
                見る
              </Link>
              <a
                href={exportHref(day.date, day.date)}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                書き出す
              </a>
            </li>
          ))}
        </ul>
      )}

      <form
        action={`/admin/chats/${chatId}/messages/export`}
        method="get"
        target="_blank"
        className="flex flex-wrap items-end gap-2"
      >
        <label className="text-sm">
          開始日
          <input type="date" name="from" className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm">
          終了日
          <input type="date" name="to" className={`${inputClass} mt-1`} />
        </label>
        <button type="submit" className={secondaryButtonClass}>
          期間を指定して書き出す
        </button>
      </form>
      <p className={hintClass}>
        会話のメッセージだけを古い順にテキストで新しいタブに表示します（評価やエラーは含めません）。日付を空欄にすると、その端を区切らずに書き出します。
      </p>
    </section>
  )
}
