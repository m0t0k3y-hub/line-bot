'use client'

import { useActionState } from 'react'

import { errorTextClass } from '@/app/admin/ui'
import {
  type ActionState,
  archivePersonaAction,
  duplicatePersonaAction,
  restoreVersionAction,
  setCurrentVersionAction,
} from './actions'

export function DuplicatePersonaButton({ id }: { id: string }) {
  return (
    <form action={duplicatePersonaAction}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="hover:underline">
        複製
      </button>
    </form>
  )
}

export function ArchivePersonaButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(archivePersonaAction, {})

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`「${name}」を削除しますか？\n会話ログに残っている版の記録は消えません。`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="text-red-600 hover:underline">
        削除
      </button>
      {state.error && <p className={errorTextClass}>{state.error}</p>}
    </form>
  )
}

export function SetCurrentVersionButton(props: { personaId: string; versionId: string }) {
  return (
    <form action={setCurrentVersionAction}>
      <input type="hidden" name="personaId" value={props.personaId} />
      <input type="hidden" name="versionId" value={props.versionId} />
      <button type="submit" className="hover:underline">
        現行版にする
      </button>
    </form>
  )
}

export function RestoreVersionButton(props: {
  personaId: string
  versionId: string
  versionNo: number
}) {
  return (
    <form
      action={restoreVersionAction}
      onSubmit={(e) => {
        if (!confirm(`版${props.versionNo}の内容で新しい版を作り、現行版にしますか？`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="personaId" value={props.personaId} />
      <input type="hidden" name="versionId" value={props.versionId} />
      <button type="submit" className="hover:underline">
        この版から新しい版を作る
      </button>
    </form>
  )
}
