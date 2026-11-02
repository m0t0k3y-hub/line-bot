'use client'

import { useState, useTransition } from 'react'

import { errorTextClass, inputClass, secondaryButtonClass, successTextClass } from '@/app/admin/ui'
import {
  type ActionState,
  deleteAllMessagesAction,
  deleteMessageAction,
  deleteMessagesInRangeAction,
  rateMessageAction,
  removeMyRatingAction,
} from './actions'

/** Bot の返答に、管理者として 👍 / 👎 とコメントを付ける */
export function RateControls(props: {
  messageId: string
  mine: { rating: number; comment: string } | undefined
}) {
  const [comment, setComment] = useState(props.mine?.comment ?? '')
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function rate(rating: 1 | -1) {
    startTransition(async () => {
      const result = await rateMessageAction({ messageId: props.messageId, rating, comment })
      setError(result.error)
    })
  }

  const buttonClass = (active: boolean) =>
    `rounded-md border px-2 py-0.5 text-sm ${
      active
        ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800'
        : 'border-zinc-300 dark:border-zinc-700'
    }`

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => rate(1)}
        className={buttonClass(props.mine?.rating === 1)}
        aria-label="良い"
      >
        👍
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => rate(-1)}
        className={buttonClass(props.mine?.rating === -1)}
        aria-label="悪い"
      >
        👎
      </button>
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="コメント（任意。👍 / 👎 を押すと一緒に保存）"
        className="min-w-48 flex-1 rounded-md border border-zinc-300 bg-transparent px-2 py-0.5 text-sm dark:border-zinc-700"
      />
      {props.mine && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await removeMyRatingAction(props.messageId)
              setComment('')
            })
          }
          className="text-xs text-zinc-500 hover:underline"
        >
          自分の評価を取り消す
        </button>
      )}
      {error && <p className={errorTextClass}>{error}</p>}
    </div>
  )
}

export function DeleteMessageButton(props: { chatId: string; messageId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('このメッセージを削除しますか？付いている評価も削除されます。')) return
        startTransition(() => deleteMessageAction(props.chatId, props.messageId))
      }}
      className="text-xs text-red-600 hover:underline"
    >
      削除
    </button>
  )
}

/** 期間を指定して、またはすべてのログを削除する */
export function BulkDeletePanel(props: { chatId: string; today: string }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(props.today)
  const [state, setState] = useState<ActionState>({})
  const [pending, startTransition] = useTransition()

  const warning = '削除したログと、そこに付いている評価は元に戻せません。評価の集計からも消えます。'

  return (
    <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <summary className="cursor-pointer text-sm font-medium">ログをまとめて削除</summary>
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`${inputClass} w-auto`}
            aria-label="開始日"
          />
          <span>〜</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={`${inputClass} w-auto`}
            aria-label="終了日"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`${from} 〜 ${to} のログを削除しますか？\n${warning}`)) return
              startTransition(async () =>
                setState(await deleteMessagesInRangeAction(props.chatId, from, to)),
              )
            }}
            className={secondaryButtonClass}
          >
            期間を指定して削除
          </button>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`このトーク・グループのログをすべて削除しますか？\n${warning}`)) return
            startTransition(async () => setState(await deleteAllMessagesAction(props.chatId)))
          }}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
        >
          すべてのログを削除
        </button>
        {state.error && <p className={errorTextClass}>{state.error}</p>}
        {state.success && <p className={successTextClass}>{state.success}</p>}
      </div>
    </details>
  )
}
