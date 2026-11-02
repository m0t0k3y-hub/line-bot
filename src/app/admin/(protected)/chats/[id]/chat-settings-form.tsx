'use client'

import { useState, useTransition } from 'react'

import { errorTextClass, inputClass, primaryButtonClass, successTextClass } from '@/app/admin/ui'
import { type ActionState, updateChatSettingsAction } from '../actions'
import { Field, NumberInput, PersonaSelect } from '../fields'
import { replyModeLabels } from '../labels'

type Props = {
  chatId: string
  isGroup: boolean
  initial: Record<
    | 'personaId'
    | 'replyMode'
    | 'keywords'
    | 'historyTurns'
    | 'historyMaxMessages'
    | 'dailyLimit'
    | 'limitMessage',
    string
  >
  personaOptions: { id: string; name: string }[]
  // 空欄のときに使われる全体の設定（プレースホルダーに出す）
  defaults: {
    personaName: string
    historyTurns: number
    historyMaxMessages: number
    dailyLimit: number
    limitMessage: string
  }
}

export function ChatSettingsForm(props: Props) {
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
          setState(await updateChatSettingsAction(props.chatId, form))
        })
      }}
    >
      <Field label="ペルソナ">
        <PersonaSelect
          value={form.personaId}
          onChange={set('personaId')}
          options={props.personaOptions}
          emptyLabel={`全体の設定を使う（${props.defaults.personaName}）`}
        />
      </Field>

      {props.isGroup && (
        <>
          <Field label="返信条件">
            <select
              value={form.replyMode}
              onChange={(e) => set('replyMode')(e.target.value)}
              className={inputClass}
            >
              {Object.entries(replyModeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {form.replyMode === 'keyword' && (
            <Field label="キーワード" hint="改行かカンマで区切って、最大20個まで登録できます。">
              <textarea
                value={form.keywords}
                onChange={(e) => set('keywords')(e.target.value)}
                rows={3}
                placeholder={'よし子さん\nおばちゃん'}
                className={inputClass}
              />
            </Field>
          )}
        </>
      )}

      <p className="text-sm text-zinc-500">
        以下は空欄にすると、全体の設定（カッコ内の値）を使います。
      </p>
      <Field label="記憶する往復数">
        <NumberInput
          value={form.historyTurns}
          onChange={set('historyTurns')}
          placeholder={`（${props.defaults.historyTurns}）`}
        />
      </Field>
      <Field label="履歴の最大件数">
        <NumberInput
          value={form.historyMaxMessages}
          onChange={set('historyMaxMessages')}
          placeholder={`（${props.defaults.historyMaxMessages}）`}
        />
      </Field>
      <Field
        label="1日の返信の上限"
        hint="0 にすると、その日は上限に達したときの返信だけを返します。"
      >
        <NumberInput
          value={form.dailyLimit}
          onChange={set('dailyLimit')}
          placeholder={`（${props.defaults.dailyLimit}）`}
        />
      </Field>
      <Field label="上限に達したときの返信">
        <input
          value={form.limitMessage}
          onChange={(e) => set('limitMessage')(e.target.value)}
          placeholder={`（${props.defaults.limitMessage}）`}
          className={inputClass}
        />
      </Field>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        保存
      </button>
      {state.error && <p className={errorTextClass}>{state.error}</p>}
      {state.success && <p className={successTextClass}>{state.success}</p>}
    </form>
  )
}
