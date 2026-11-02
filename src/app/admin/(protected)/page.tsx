import Link from 'next/link'

import { requireAdmin } from '@/admin/auth'
import { hintClass } from '@/app/admin/ui'
import { getDashboardStats, listFeedbacks } from '@/feedbacks/store'

export const instant = false

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tokyo',
})

export default async function DashboardPage() {
  const admin = await requireAdmin()
  const [stats, feedbacks] = await Promise.all([getDashboardStats(), listFeedbacks({})])
  const recentFeedbacks = feedbacks.slice(0, 5)

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">ダッシュボード</h1>
        <p className={hintClass}>
          ようこそ、{admin.name || admin.email} さん。数字は今日（日本時間）のものです。
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="今日の返信" value={`${stats.replyTotal} 件`} />
        <Stat
          label="今日の評価"
          value={`👍 ${stats.feedbacks.up}・👎 ${stats.feedbacks.down}`}
          href="/admin/feedbacks"
        />
        <Stat label="今日のエラー" value={`${stats.errorCount} 件`} warn={stats.errorCount > 0} />
      </dl>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">トーク・グループ別の今日の返信</h2>
        {stats.usageByChat.length === 0 ? (
          <p className={hintClass}>今日はまだ返信していません。</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {stats.usageByChat.map((row) => (
              <li key={row.chatId} className="flex gap-2">
                <Link href={`/admin/chats/${row.chatId}/messages`} className="hover:underline">
                  {row.chatName || '（名前なし）'}
                </Link>
                <span className="text-zinc-500">{row.replyCount} 件</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">最近の評価</h2>
        {recentFeedbacks.length === 0 ? (
          <p className={hintClass}>評価はまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {recentFeedbacks.map((feedback) => (
              <li key={feedback.id} className="text-sm">
                <span>{feedback.rating > 0 ? '👍' : '👎'}</span>{' '}
                {feedback.comment || <span className={hintClass}>（コメントなし）</span>}
                <span className={`ml-2 ${hintClass}`}>
                  {feedback.rater}・{dateFormat.format(feedback.createdAt)}
                  {feedback.persona && `・${feedback.persona}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/feedbacks" className="text-sm hover:underline">
          すべての評価を見る →
        </Link>
      </section>
    </div>
  )
}

function Stat(props: { label: string; value: string; href?: string; warn?: boolean }) {
  const body = (
    <>
      <dt className={hintClass}>{props.label}</dt>
      <dd className={`text-lg font-semibold ${props.warn ? 'text-red-600' : ''}`}>{props.value}</dd>
    </>
  )
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      {props.href ? (
        <Link href={props.href} className="block hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  )
}
