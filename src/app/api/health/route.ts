import { sql } from 'drizzle-orm'
import { connection } from 'next/server'

import { getDb } from '@/db'

// デプロイ後の動作確認用。DB に接続できるかを返す
export async function GET() {
  await connection()

  try {
    await getDb().execute(sql`select 1`)
    return Response.json({ status: 'ok', db: 'ok' })
  } catch (error) {
    console.error('health check failed', error)
    return Response.json({ status: 'error', db: 'unreachable' }, { status: 503 })
  }
}
