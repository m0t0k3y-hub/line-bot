import { z } from 'zod'

import { type Provider, providers } from '@/lib/providers'

// ペルソナ版のうち、LLM の呼び出しに使う部分。編集画面とプレイグラウンドで共通に使う

export type PersonaConfig = {
  systemPrompt: string
  fewShots: { user: string; assistant: string }[]
  provider: Provider
  model: string
  maxOutputTokens: number
  providerOptions: Record<string, unknown>
}

/** 編集フォームの値。プロバイダー別のオプションは JSON の文字列で持つ */
export type PersonaConfigForm = Omit<PersonaConfig, 'providerOptions' | 'maxOutputTokens'> & {
  maxOutputTokens: string
  providerOptions: string
}

const jsonObject = z.string().transform((text, ctx): Record<string, unknown> => {
  if (text.trim() === '') return {}
  try {
    const value: unknown = JSON.parse(text)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  } catch {
    // 下でエラーにする
  }
  ctx.addIssue({ code: 'custom', message: 'JSON のオブジェクト（{ ... }）で入力してください' })
  return z.NEVER
})

export const MAX_OUTPUT_TOKENS_LIMIT = 128000

export const maxOutputTokensSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, '最大出力トークン数は数字で入力してください')
  .transform(Number)
  .pipe(
    z
      .number()
      .min(1, '最大出力トークン数は 1 以上にしてください')
      .max(
        MAX_OUTPUT_TOKENS_LIMIT,
        `最大出力トークン数は ${MAX_OUTPUT_TOKENS_LIMIT} 以下にしてください`,
      ),
  )

/** 全角の数字を半角にし、数字以外を取り除く（入力欄用） */
export function toDigits(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
}

export const personaConfigFormSchema = z.object({
  systemPrompt: z.string().trim().min(1, 'システムプロンプトを入力してください'),
  fewShots: z.array(
    z.object({
      user: z.string().trim().min(1, '会話例のユーザーの発言を入力してください'),
      assistant: z.string().trim().min(1, '会話例の理想の返答を入力してください'),
    }),
  ),
  provider: z.enum(providers),
  model: z.string().trim().min(1, 'モデル ID を入力してください'),
  maxOutputTokens: maxOutputTokensSchema,
  providerOptions: jsonObject,
}) satisfies z.ZodType<PersonaConfig, PersonaConfigForm>

export function toConfigForm(config: PersonaConfig): PersonaConfigForm {
  return {
    ...config,
    maxOutputTokens: String(config.maxOutputTokens),
    providerOptions:
      Object.keys(config.providerOptions).length > 0
        ? JSON.stringify(config.providerOptions, null, 2)
        : '',
  }
}

/** 検証エラーを1つの文にまとめる */
export function formatIssues(error: z.ZodError): string {
  return [...new Set(error.issues.map((issue) => issue.message))].join('\n')
}

export function isSameConfig(a: PersonaConfig, b: PersonaConfig): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}

function normalize(config: PersonaConfig) {
  return {
    systemPrompt: config.systemPrompt,
    fewShots: config.fewShots.map(({ user, assistant }) => ({ user, assistant })),
    provider: config.provider,
    model: config.model,
    maxOutputTokens: config.maxOutputTokens,
    providerOptions: sortKeys(config.providerOptions),
  }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, inner]) => [key, sortKeys(inner)]),
    )
  }
  return value
}
