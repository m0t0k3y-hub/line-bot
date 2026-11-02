'use client'

import { useState, useTransition } from 'react'

import { hintClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/app/admin/ui'
import type { ChatTurn } from '@/llm'
import type { PersonaConfigForm } from '@/personas/config'
import { type PlaygroundContext, runPlaygroundAction } from './actions'

type Turn = ChatTurn & { meta?: string; error?: boolean }

/**
 * ペルソナと会話して試す。getConfig は送信のたびに呼ばれるので、
 * 編集画面では保存前の内容がそのまま使われる。
 */
export function Playground({ getConfig }: { getConfig: () => PersonaConfigForm }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [context, setContext] = useState<PlaygroundContext>({ type: 'user', speakerName: 'テスト' })
  const [pending, startTransition] = useTransition()

  function send() {
    const text = input.trim()
    if (!text || pending) return

    const userTurn: Turn = { role: 'user', content: text }
    // エラーになった返答は LINE と同じく履歴に含めない
    const history: ChatTurn[] = [...turns, userTurn]
      .filter((turn) => !turn.error)
      .map(({ role, content }) => ({ role, content }))
    setTurns((prev) => [...prev, userTurn])
    setInput('')

    startTransition(async () => {
      const result = await runPlaygroundAction({ config: getConfig(), context, history })
      setTurns((prev) => [
        ...prev,
        result.ok
          ? {
              role: 'assistant',
              content: result.text,
              meta: `入力 ${result.inputTokens ?? '?'} / 出力 ${result.outputTokens ?? '?'} トークン・${(result.latencyMs / 1000).toFixed(1)} 秒`,
            }
          : { role: 'assistant', content: result.error, error: true },
      ])
    })
  }

  return (
    <div className="flex h-full min-h-96 flex-col rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <select
          value={context.type}
          onChange={(e) =>
            setContext({ ...context, type: e.target.value as PlaygroundContext['type'] })
          }
          className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        >
          <option value="user">1対1のトーク</option>
          <option value="group">グループ</option>
        </select>
        <label className="flex items-center gap-1">
          <span className={hintClass}>あなたの名前</span>
          <input
            value={context.speakerName}
            onChange={(e) => setContext({ ...context, speakerName: e.target.value })}
            className="w-28 rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
        <button
          type="button"
          onClick={() => setTurns([])}
          disabled={pending || turns.length === 0}
          className={`ml-auto ${secondaryButtonClass}`}
        >
          クリア
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 && (
          <p className={hintClass}>LINE と同じ条件で返事を試せます。会話は保存されません。</p>
        )}
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === 'user' ? 'text-right' : ''}>
            <p
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-left text-sm whitespace-pre-wrap ${
                turn.role === 'user'
                  ? 'bg-green-100 dark:bg-green-900'
                  : turn.error
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-zinc-100 dark:bg-zinc-800'
              }`}
            >
              {turn.content}
            </p>
            {turn.meta && <p className={`mt-1 ${hintClass}`}>{turn.meta}</p>}
          </div>
        ))}
        {pending && <p className={hintClass}>返事を待っています…</p>}
      </div>

      <form
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力"
          className={inputClass}
        />
        <button type="submit" disabled={pending || !input.trim()} className={primaryButtonClass}>
          送信
        </button>
      </form>
    </div>
  )
}
