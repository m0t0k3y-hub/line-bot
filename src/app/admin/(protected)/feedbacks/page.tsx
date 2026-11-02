import Link from 'next/link'

import { requireAdmin } from '@/admin/auth'
import { hintClass, secondaryButtonClass } from '@/app/admin/ui'
import { listPersonaOptions } from '@/chats/store'
import { type FeedbackFilters, listFeedbacks, listUsedModels } from '@/feedbacks/store'

export const instant = false

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tokyo',
})

const selectClass =
  'rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700'

export default async function FeedbacksPage({ searchParams }: PageProps<'/admin/feedbacks'>) {
  await requireAdmin()
  const query = await searchParams
  const param = (key: string) => (typeof query[key] === 'string' ? query[key] : '')

  const filters: FeedbackFilters = {
    personaId: param('persona') || undefined,
    versionId: param('version') || undefined,
    model: param('model') || undefined,
    rating: param('rating') === 'up' ? 1 : param('rating') === 'down' ? -1 : undefined,
  }

  const [feedbacks, personas, models] = await Promise.all([
    listFeedbacks(filters),
    listPersonaOptions(),
    listUsedModels(),
  ])
  const up = feedbacks.filter((f) => f.rating > 0).length

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold">評価</h1>

      <form className="flex flex-wrap items-center gap-2">
        <select name="persona" defaultValue={filters.personaId ?? ''} className={selectClass}>
          <option value="">すべてのペルソナ</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
            </option>
          ))}
        </select>
        <select name="model" defaultValue={filters.model ?? ''} className={selectClass}>
          <option value="">すべてのモデル</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <select name="rating" defaultValue={param('rating')} className={selectClass}>
          <option value="">👍 / 👎</option>
          <option value="up">👍 だけ</option>
          <option value="down">👎 だけ</option>
        </select>
        {filters.versionId && <input type="hidden" name="version" value={filters.versionId} />}
        <button type="submit" className={secondaryButtonClass}>
          絞り込む
        </button>
        {(filters.personaId || filters.versionId || filters.model || filters.rating) && (
          <Link href="/admin/feedbacks" className="text-sm hover:underline">
            条件をクリア
          </Link>
        )}
      </form>

      <p className={hintClass}>
        {feedbacks.length} 件（👍 {up}・👎 {feedbacks.length - up}）
        {feedbacks.length === 200 && '。新しい 200 件だけを表示しています'}
      </p>

      <ul className="space-y-3">
        {feedbacks.map((feedback) => (
          <li
            key={feedback.id}
            className="space-y-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="text-base">{feedback.rating > 0 ? '👍' : '👎'}</span>
              <span>
                {feedback.rater}
                {feedback.source === 'admin' ? '（管理者）' : '（LINE）'}
              </span>
              <span>{dateFormat.format(feedback.createdAt)}</span>
              {feedback.persona && <span>{feedback.persona}</span>}
              {feedback.model && <span>{feedback.model}</span>}
              <Link href={`/admin/chats/${feedback.chatId}/messages`} className="hover:underline">
                {feedback.chatName || '（名前なし）'} のログ
              </Link>
            </div>
            {feedback.comment && <p className="text-sm font-medium">{feedback.comment}</p>}
            <p className="border-l-2 border-zinc-300 pl-2 text-sm whitespace-pre-wrap text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {feedback.replyText}
            </p>
          </li>
        ))}
      </ul>
      {feedbacks.length === 0 && <p className={hintClass}>評価はまだありません。</p>}
    </div>
  )
}
