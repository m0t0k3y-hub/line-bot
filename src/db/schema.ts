import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import { type Provider, providers } from '../lib/providers'

// テーブルの意味は docs/spec.md「7. データモデル」を参照

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  // 小文字に正規化して保存する
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  createdBy: uuid('created_by').references((): AnyPgColumn => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export { type Provider, providers }

export type FewShot = { user: string; assistant: string }

export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  // persona_versions と相互参照になるため、作成直後は null になる
  currentVersionId: uuid('current_version_id').references((): AnyPgColumn => personaVersions.id),
  // 削除したペルソナ。会話ログが版を参照しているため、行は消さずに一覧から隠す
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  ...timestamps,
})

export const personaVersions = pgTable(
  'persona_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    systemPrompt: text('system_prompt').notNull(),
    fewShots: jsonb('few_shots').$type<FewShot[]>().notNull().default([]),
    provider: text('provider', { enum: providers }).notNull(),
    model: text('model').notNull(),
    maxOutputTokens: integer('max_output_tokens').notNull(),
    providerOptions: jsonb('provider_options')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    note: text('note').notNull().default(''),
    createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.personaId, t.versionNo)],
)

export const chatTypes = ['user', 'group', 'room'] as const
export const replyModes = ['mention', 'keyword', 'all'] as const

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  lineChatId: text('line_chat_id').notNull().unique(),
  type: text('type', { enum: chatTypes }).notNull(),
  name: text('name').notNull().default(''),
  active: boolean('active').notNull().default(true),
  personaId: uuid('persona_id').references(() => personas.id, { onDelete: 'set null' }),
  replyMode: text('reply_mode', { enum: replyModes }).notNull().default('mention'),
  keywords: text('keywords').array().notNull().default([]),
  historyTurns: integer('history_turns'),
  historyMaxMessages: integer('history_max_messages'),
  dailyLimit: integer('daily_limit'),
  limitMessage: text('limit_message'),
  ...timestamps,
})

export const lineUsers = pgTable('line_users', {
  lineUserId: text('line_user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const messageRoles = ['user', 'assistant'] as const
export const messageKinds = ['chat', 'feedback', 'limit_notice', 'error'] as const

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: text('role', { enum: messageRoles }).notNull(),
    kind: text('kind', { enum: messageKinds }).notNull().default('chat'),
    lineMessageId: text('line_message_id'),
    lineUserId: text('line_user_id'),
    text: text('text').notNull(),
    personaVersionId: uuid('persona_version_id').references(() => personaVersions.id),
    provider: text('provider', { enum: providers }),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    latencyMs: integer('latency_ms'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.chatId, t.createdAt), index().on(t.lineMessageId)],
)

// LINE の再送で同じイベントを二重に処理しないための記録
export const webhookEvents = pgTable('webhook_events', {
  webhookEventId: text('webhook_event_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// 全体の設定。id = 1 の1行だけを使う
export const settings = pgTable('settings', {
  id: smallint('id').primaryKey().default(1),
  defaultPersonaId: uuid('default_persona_id').references(() => personas.id, {
    onDelete: 'set null',
  }),
  historyTurns: integer('history_turns').notNull().default(10),
  historyMaxMessages: integer('history_max_messages').notNull().default(50),
  dailyLimit: integer('daily_limit').notNull().default(100),
  limitMessage: text('limit_message').notNull().default('今日はもう疲れたけん、また明日ね'),
  errorMessage: text('error_message')
    .notNull()
    .default('ちょっと調子悪かけん、もう一回言うてくれん？'),
  feedbackAckEnabled: boolean('feedback_ack_enabled').notNull().default(false),
  feedbackAckMessage: text('feedback_ack_message').notNull().default('ありがと！'),
  llmTimeoutSec: integer('llm_timeout_sec').notNull().default(30),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Admin = typeof admins.$inferSelect
export type Persona = typeof personas.$inferSelect
export type Chat = typeof chats.$inferSelect
export type Message = typeof messages.$inferSelect
export type PersonaVersion = typeof personaVersions.$inferSelect
export type Settings = typeof settings.$inferSelect
