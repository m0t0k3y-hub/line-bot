import 'server-only'

import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { admins, chats, messages, personas, personaVersions, settings } from '@/db/schema'
import type { PersonaConfig } from './config'

export async function listPersonas() {
  const db = getDb()
  const rows = await db
    .select({ persona: personas, version: personaVersions })
    .from(personas)
    .leftJoin(personaVersions, eq(personaVersions.id, personas.currentVersionId))
    .where(isNull(personas.archivedAt))
    .orderBy(asc(personas.createdAt))

  const [setting] = await db.select({ defaultPersonaId: settings.defaultPersonaId }).from(settings)
  const chatCounts = await db
    .select({ personaId: chats.personaId, value: count() })
    .from(chats)
    .where(eq(chats.active, true))
    .groupBy(chats.personaId)
  const chatCountById = new Map(chatCounts.map((row) => [row.personaId, row.value]))

  return rows.map(({ persona, version }) => ({
    ...persona,
    currentVersion: version,
    isDefault: persona.id === setting?.defaultPersonaId,
    chatCount: chatCountById.get(persona.id) ?? 0,
  }))
}

export async function getPersona(id: string) {
  const [row] = await getDb()
    .select({ persona: personas, version: personaVersions })
    .from(personas)
    .leftJoin(personaVersions, eq(personaVersions.id, personas.currentVersionId))
    .where(and(eq(personas.id, id), isNull(personas.archivedAt)))
  return row && { ...row.persona, currentVersion: row.version }
}

/** 版の一覧（新しい順）。作成者の名前と、LINE での返答数を付ける */
export async function listVersions(personaId: string) {
  const db = getDb()
  const rows = await db
    .select({ version: personaVersions, authorName: admins.name, authorEmail: admins.email })
    .from(personaVersions)
    .leftJoin(admins, eq(admins.id, personaVersions.createdBy))
    .where(eq(personaVersions.personaId, personaId))
    .orderBy(desc(personaVersions.versionNo))

  const ids = rows.map((row) => row.version.id)
  const replyCounts =
    ids.length === 0
      ? []
      : await db
          .select({ versionId: messages.personaVersionId, value: count() })
          .from(messages)
          .where(
            and(
              inArray(messages.personaVersionId, ids),
              eq(messages.role, 'assistant'),
              eq(messages.kind, 'chat'),
            ),
          )
          .groupBy(messages.personaVersionId)
  const replyCountById = new Map(replyCounts.map((row) => [row.versionId, row.value]))

  return rows.map((row) => ({
    ...row.version,
    author: row.authorName || row.authorEmail || null,
    replyCount: replyCountById.get(row.version.id) ?? 0,
  }))
}

export async function getVersion(personaId: string, versionId: string) {
  const [version] = await getDb()
    .select()
    .from(personaVersions)
    .where(and(eq(personaVersions.id, versionId), eq(personaVersions.personaId, personaId)))
  return version
}

function versionValues(
  personaId: string,
  config: PersonaConfig,
  meta: { note: string; createdBy: string },
) {
  return {
    id: crypto.randomUUID(),
    personaId,
    // 版番号はペルソナごとの連番。同時に保存されたら一意制約でどちらかが失敗する
    versionNo: sql<number>`(select coalesce(max(${personaVersions.versionNo}), 0) + 1 from ${personaVersions} where ${personaVersions.personaId} = ${personaId})`,
    systemPrompt: config.systemPrompt,
    fewShots: config.fewShots,
    provider: config.provider,
    model: config.model,
    maxOutputTokens: config.maxOutputTokens,
    providerOptions: config.providerOptions,
    note: meta.note,
    createdBy: meta.createdBy,
  }
}

export async function createPersona(input: {
  name: string
  description: string
  config: PersonaConfig
  note: string
  createdBy: string
}): Promise<string> {
  const db = getDb()
  const personaId = crypto.randomUUID()
  const version = versionValues(personaId, input.config, input)

  // persona と version は相互参照なので、作成してから現行版を設定する
  await db.batch([
    db.insert(personas).values({
      id: personaId,
      name: input.name,
      description: input.description,
    }),
    db.insert(personaVersions).values(version),
    db.update(personas).set({ currentVersionId: version.id }).where(eq(personas.id, personaId)),
  ])
  return personaId
}

/** 新しい版を作り、現行版にする */
export async function createVersion(
  personaId: string,
  config: PersonaConfig,
  meta: { note: string; createdBy: string },
): Promise<void> {
  const db = getDb()
  const version = versionValues(personaId, config, meta)
  await db.batch([
    db.insert(personaVersions).values(version),
    db.update(personas).set({ currentVersionId: version.id }).where(eq(personas.id, personaId)),
  ])
}

export async function setCurrentVersion(personaId: string, versionId: string): Promise<void> {
  await getDb()
    .update(personas)
    .set({ currentVersionId: versionId })
    .where(eq(personas.id, personaId))
}

export async function updatePersonaMeta(
  id: string,
  values: { name: string; description: string },
): Promise<void> {
  await getDb().update(personas).set(values).where(eq(personas.id, id))
}

/** 標準ペルソナか、どこかのチャットに割り当てられていれば理由を返す */
export async function getPersonaUsage(id: string): Promise<string | undefined> {
  const db = getDb()
  const [setting] = await db.select({ defaultPersonaId: settings.defaultPersonaId }).from(settings)
  if (setting?.defaultPersonaId === id) return '標準ペルソナに設定されています'

  const [{ value }] = await db
    .select({ value: count() })
    .from(chats)
    .where(and(eq(chats.personaId, id), eq(chats.active, true)))
  if (value > 0) return `${value} 件のトーク・グループに割り当てられています`
  return undefined
}

export async function archivePersona(id: string): Promise<void> {
  await getDb().update(personas).set({ archivedAt: new Date() }).where(eq(personas.id, id))
}
