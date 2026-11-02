import { loadEnvConfig } from '@next/env'
import { count, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

import { personas, personaVersions, settings } from '../src/db/schema'
import { initialPersona } from './seed-data'

// 使い方：tsx scripts/db.ts <migrate|seed|deploy>
//   migrate … マイグレーションを適用する
//   seed    … ペルソナが1つもなければ初期データを入れる
//   deploy  … Vercel の本番ビルドでだけ migrate と seed を行う（それ以外の環境では何もしない）

loadEnvConfig(process.cwd())

function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL が設定されていません')
  return drizzle(url)
}

async function runMigrations() {
  await migrate(getDb(), { migrationsFolder: './drizzle' })
  console.log('migrations applied')
}

async function seed() {
  const db = getDb()
  const [{ value: personaCount }] = await db.select({ value: count() }).from(personas)
  if (personaCount > 0) {
    console.log('personas already exist, skipping seed')
    return
  }

  const { name, description, ...version } = initialPersona
  const personaId = crypto.randomUUID()
  const versionId = crypto.randomUUID()

  // persona と version は相互参照なので、作成してから現行版を設定する
  await db.batch([
    db.insert(personas).values({ id: personaId, name, description }),
    db.insert(personaVersions).values({
      id: versionId,
      personaId,
      versionNo: 1,
      ...version,
      note: '初期データ',
    }),
    db.update(personas).set({ currentVersionId: versionId }).where(eq(personas.id, personaId)),
    db
      .insert(settings)
      .values({ id: 1, defaultPersonaId: personaId })
      .onConflictDoUpdate({ target: settings.id, set: { defaultPersonaId: personaId } }),
  ])
  console.log(`seeded persona "${name}"`)
}

async function main(command: string | undefined) {
  switch (command) {
    case 'migrate':
      return runMigrations()
    case 'seed':
      return seed()
    case 'deploy':
      if (process.env.VERCEL_ENV !== 'production') {
        console.log(`VERCEL_ENV=${process.env.VERCEL_ENV ?? '(unset)'}, skipping db deploy`)
        return
      }
      await runMigrations()
      return seed()
    default:
      throw new Error(`unknown command: ${command}`)
  }
}

main(process.argv[2]).catch((error) => {
  console.error(error)
  process.exit(1)
})
