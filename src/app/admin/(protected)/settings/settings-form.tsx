'use client'

import { useState, useTransition } from 'react'

import { errorTextClass, inputClass, primaryButtonClass, successTextClass } from '@/app/admin/ui'
import { type ActionState, updateGlobalSettingsAction } from '../chats/actions'
import { Field, NumberInput, PersonaSelect } from '../chats/fields'

type Props = {
  initial: Record<
    | 'defaultPersonaId'
    | 'historyTurns'
    | 'historyMaxMessages'
    | 'dailyLimit'
    | 'limitMessage'
    | 'errorMessage'
    | 'llmTimeoutSec'
    | 'feedbackAckEnabled'
    | 'feedbackAckMessage',
    string
  >
  personaOptions: { id: string; name: string }[]
}

export function SettingsForm(props: Props) {
  const [form, setForm] = useState(props.initial)
  const [state, setState] = useState<ActionState>({})
  const [pending, startTransition] = useTransition()

  const set = (key: keyof Props['initial']) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          setState(await updateGlobalSettingsAction(form))
        })
      }}
    >
      <Field
        label="標準ペルソナ"
        hint="ペルソナを個別に割り当てていないトーク・グループで使います。未設定だと返信しません。"
      >
        <PersonaSelect
          value={form.defaultPersonaId}
          onChange={set('defaultPersonaId')}
          options={props.personaOptions}
          emptyLabel="未設定"
        />
      </Field>
      <Field label="記憶する往復数" hint="LLM に渡す会話の履歴の長さ（0〜50）。">
        <NumberInput value={form.historyTurns} onChange={set('historyTurns')} />
      </Field>
      <Field
        label="履歴の最大件数"
        hint="発言の多いグループで履歴が長くなりすぎないようにする上限（1〜200）。"
      >
        <NumberInput value={form.historyMaxMessages} onChange={set('historyMaxMessages')} />
      </Field>
      <Field label="1日の返信の上限" hint="トーク・グループごとに日本時間で数えます（0〜10000）。">
        <NumberInput value={form.dailyLimit} onChange={set('dailyLimit')} />
      </Field>
      <Field label="上限に達したときの返信">
        <input
          value={form.limitMessage}
          onChange={(e) => set('limitMessage')(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="エラー時の返信" hint="LLM の呼び出しに失敗したときに返します。">
        <input
          value={form.errorMessage}
          onChange={(e) => set('errorMessage')(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="LLM の時間切れ（秒）" hint="5〜50 秒。これを過ぎるとエラー時の返信を返します。">
        <NumberInput value={form.llmTimeoutSec} onChange={set('llmTimeoutSec')} />
      </Field>
      <Field
        label="評価（👍 / 👎）を受け付けたときの返信"
        hint="オフにすると、評価を受け付けても何も返しません。"
      >
        <span className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.feedbackAckEnabled === 'true'}
            onChange={(e) => set('feedbackAckEnabled')(String(e.target.checked))}
          />
          返信する
        </span>
        {form.feedbackAckEnabled === 'true' && (
          <input
            value={form.feedbackAckMessage}
            onChange={(e) => set('feedbackAckMessage')(e.target.value)}
            className={inputClass}
          />
        )}
      </Field>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        保存
      </button>
      {state.error && <p className={errorTextClass}>{state.error}</p>}
      {state.success && <p className={successTextClass}>{state.success}</p>}
    </form>
  )
}
