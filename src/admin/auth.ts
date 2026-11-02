import 'server-only'

import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'

import { auth } from '@/auth'
import { findAdminByEmail } from './store'

/**
 * ログイン中の管理者を返す。ログインしていない、または管理者から外された場合はログイン画面へ移る。
 * 管理画面のページとサーバーアクションは、必ずこれを通してから DB を読み書きする。
 */
export const requireAdmin = cache(async () => {
  // Auth.js が内部で乱数を使うため、事前描画ではなくリクエスト時に実行する
  await connection()
  const session = await auth()
  const email = session?.user?.email
  if (!email) redirect('/admin/login')

  // セッションが有効でも、管理者から外されていれば入れない
  const admin = await findAdminByEmail(email)
  if (!admin) redirect('/admin/login?error=AccessDenied')

  return admin
})
