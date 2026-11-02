import { asc, eq } from 'drizzle-orm'

import { getDb } from '@/db'
import { admins } from '@/db/schema'

export async function findAdminByEmail(email: string) {
  const [admin] = await getDb().select().from(admins).where(eq(admins.email, email.toLowerCase()))
  return admin
}

export async function listAdmins() {
  return getDb().select().from(admins).orderBy(asc(admins.createdAt))
}

/** 追加できたら true。登録済みなら false */
export async function insertAdmin(values: {
  email: string
  name?: string
  createdBy?: string
}): Promise<boolean> {
  const inserted = await getDb()
    .insert(admins)
    .values({ ...values, email: values.email.toLowerCase() })
    .onConflictDoNothing()
    .returning({ id: admins.id })
  return inserted.length > 0
}

export async function updateAdminName(id: string, name: string): Promise<void> {
  await getDb().update(admins).set({ name }).where(eq(admins.id, id))
}

export async function deleteAdmin(id: string): Promise<void> {
  await getDb().delete(admins).where(eq(admins.id, id))
}
