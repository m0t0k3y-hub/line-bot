import Link from 'next/link'
import { type ReactNode, Suspense } from 'react'

import { requireAdmin } from '@/admin/auth'
import { signOut } from '@/auth'

// 機能が増えたらここにメニューを追加する
const menu = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/personas', label: 'ペルソナ' },
  { href: '/admin/playground', label: 'プレイグラウンド' },
  { href: '/admin/admins', label: '管理者' },
] as const

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-zinc-200 p-4 md:w-56 md:border-r md:border-b-0 dark:border-zinc-800">
        <p className="mb-4 text-sm font-semibold">方言チャットボット</p>
        <nav className="flex gap-1 md:flex-col">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Suspense>
          <AccountMenu />
        </Suspense>
      </aside>
      <main className="flex-1 p-6">
        <Suspense fallback={<p className="text-sm text-zinc-500">読み込み中…</p>}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  )
}

/** 管理者でなければページの中身を描画せずにログイン画面へ移る */
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin()
  return children
}

async function AccountMenu() {
  const admin = await requireAdmin()

  async function logout() {
    'use server'
    await signOut({ redirectTo: '/admin/login' })
  }

  return (
    <div className="mt-6 space-y-2 text-xs text-zinc-500">
      <p className="truncate" title={admin.email}>
        {admin.name || admin.email}
      </p>
      <form action={logout}>
        <button type="submit" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
          ログアウト
        </button>
      </form>
    </div>
  )
}
