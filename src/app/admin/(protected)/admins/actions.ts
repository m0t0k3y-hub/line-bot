'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/admin/auth'
import { deleteAdmin, insertAdmin } from '@/admin/store'

export type AddAdminState = { error?: string; success?: string }

export async function addAdminAction(
  _prev: AddAdminState,
  formData: FormData,
): Promise<AddAdminState> {
  const admin = await requireAdmin()

  const parsed = z.email().safeParse(String(formData.get('email') ?? '').trim())
  if (!parsed.success) return { error: 'メールアドレスの形式が正しくありません。' }

  const added = await insertAdmin({ email: parsed.data, createdBy: admin.id })
  if (!added) return { error: 'このメールアドレスはすでに登録されています。' }

  refresh()
  return { success: `${parsed.data} を追加しました。` }
}

export async function removeAdminAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const id = String(formData.get('id') ?? '')
  // 自分自身は削除できない（管理者が0人になるのも防げる）
  if (!id || id === admin.id) return

  await deleteAdmin(id)
  refresh()
}
