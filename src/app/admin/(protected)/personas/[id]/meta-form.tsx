'use client'

import { useActionState } from 'react'

import {
  errorTextClass,
  hintClass,
  inputClass,
  secondaryButtonClass,
  successTextClass,
} from '@/app/admin/ui'
import { type ActionState, updateMetaAction } from '../actions'

/** 名前と説明は版の対象外なので、別に保存する */
export function PersonaMetaForm(props: { id: string; name: string; description: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMetaAction, {})

  return (
    <form
      action={action}
      className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <input type="hidden" name="id" value={props.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <label className="space-y-1">
          <span className={hintClass}>名前</span>
          <input name="name" defaultValue={props.name} className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className={hintClass}>説明（管理者向けのメモ）</span>
          <input name="description" defaultValue={props.description} className={inputClass} />
        </label>
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          名前と説明を保存
        </button>
      </div>
      {state.error && <p className={errorTextClass}>{state.error}</p>}
      {state.success && <p className={successTextClass}>{state.success}</p>}
    </form>
  )
}
