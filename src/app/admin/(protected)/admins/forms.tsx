'use client'

import { useActionState } from 'react'

import { addAdminAction, type AddAdminState, removeAdminAction } from './actions'

export function AddAdminForm() {
  const [state, action, pending] = useActionState<AddAdminState, FormData>(addAdminAction, {})

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="example@gmail.com"
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          追加
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">{state.success}</p>}
    </form>
  )
}

export function RemoveAdminButton({ id, email }: { id: string; email: string }) {
  return (
    <form
      action={removeAdminAction}
      onSubmit={(event) => {
        if (!confirm(`${email} を管理者から削除しますか？`)) event.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-red-600 hover:underline">
        削除
      </button>
    </form>
  )
}
