import { Suspense } from 'react'

import { signIn } from '@/auth'

export default function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  async function login() {
    'use server'
    await signIn('google', { redirectTo: '/admin' })
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-zinc-200 p-8 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">方言チャットボット 管理画面</h1>
        <Suspense>
          <LoginError searchParams={searchParams} />
        </Suspense>
        <form action={login}>
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Google でログイン
          </button>
        </form>
      </div>
    </main>
  )
}

async function LoginError({ searchParams }: Pick<PageProps<'/admin/login'>, 'searchParams'>) {
  const { error } = await searchParams
  if (!error) return null

  const message =
    error === 'AccessDenied'
      ? 'このアカウントは管理者として登録されていません。'
      : 'ログインに失敗しました。もう一度お試しください。'
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  )
}
