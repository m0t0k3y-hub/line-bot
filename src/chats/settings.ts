import { z } from 'zod'

import type { Chat, Settings } from '@/db/schema'

/** チャットごとの上書きがあればそれを、なければ全体の設定を使う（docs/spec.md「5.2」の⑤） */
export function resolveChatSettings(
  chat: Pick<
    Chat,
    'personaId' | 'historyTurns' | 'historyMaxMessages' | 'dailyLimit' | 'limitMessage'
  >,
  settings: Pick<
    Settings,
    'defaultPersonaId' | 'historyTurns' | 'historyMaxMessages' | 'dailyLimit' | 'limitMessage'
  >,
) {
  return {
    personaId: chat.personaId ?? settings.defaultPersonaId,
    historyTurns: chat.historyTurns ?? settings.historyTurns,
    historyMaxMessages: chat.historyMaxMessages ?? settings.historyMaxMessages,
    dailyLimit: chat.dailyLimit ?? settings.dailyLimit,
    limitMessage: chat.limitMessage || settings.limitMessage,
  }
}

const jstDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 日本時間の日付（YYYY-MM-DD）。回数制限は日本時間の 0:00 で切り替わる */
export function jstDate(now: Date = new Date()): string {
  return jstDateFormat.format(now)
}

// ---- 管理画面のフォームの検証 ----

export const limits = {
  historyTurns: { min: 0, max: 50 },
  historyMaxMessages: { min: 1, max: 200 },
  dailyLimit: { min: 0, max: 10000 },
  // Webhook の最大実行時間（60 秒）より短くする
  llmTimeoutSec: { min: 5, max: 50 },
} as const

function intField(label: string, { min, max }: { min: number; max: number }) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, `${label}は数字で入力してください`)
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `${label}は ${min} 以上にしてください`)
        .max(max, `${label}は ${max} 以下にしてください`),
    )
}

/** 空欄なら null（全体の設定を使う） */
function optionalIntField(label: string, range: { min: number; max: number }) {
  return z.union([z.literal('').transform(() => null), intField(label, range)])
}

const message = (label: string) =>
  z.string().trim().max(1000, `${label}は1000文字以内にしてください`)

export const globalSettingsSchema = z.object({
  defaultPersonaId: z.string().transform((v) => v || null),
  historyTurns: intField('記憶する往復数', limits.historyTurns),
  historyMaxMessages: intField('履歴の最大件数', limits.historyMaxMessages),
  dailyLimit: intField('1日の返信の上限', limits.dailyLimit),
  limitMessage: message('上限に達したときの返信').min(
    1,
    '上限に達したときの返信を入力してください',
  ),
  errorMessage: message('エラー時の返信').min(1, 'エラー時の返信を入力してください'),
  llmTimeoutSec: intField('LLM の時間切れ', limits.llmTimeoutSec),
})

export const chatSettingsSchema = z.object({
  personaId: z.string().transform((v) => v || null),
  replyMode: z.enum(['mention', 'keyword', 'all']),
  keywords: z.string().transform((text) =>
    [
      ...new Set(
        text
          .split(/[\n,、]/)
          .map((keyword) => keyword.trim())
          .filter(Boolean),
      ),
    ].slice(0, 20),
  ),
  historyTurns: optionalIntField('記憶する往復数', limits.historyTurns),
  historyMaxMessages: optionalIntField('履歴の最大件数', limits.historyMaxMessages),
  dailyLimit: optionalIntField('1日の返信の上限', limits.dailyLimit),
  limitMessage: message('上限に達したときの返信').transform((v) => v || null),
})
