import { z } from 'zod'

// .env.example をそのまま写すと空文字になるため、空文字は未設定として扱う
const optionalKey = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
)

// 各フェーズで必要になった変数をここに追加していく
const envSchema = z.object({
  DATABASE_URL: z.url(),
  LINE_CHANNEL_SECRET: z.string().min(1),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
  // LLM の API キーは使うプロバイダーの分だけあればよい
  ANTHROPIC_API_KEY: optionalKey,
  OPENAI_API_KEY: optionalKey,
  GOOGLE_GENERATIVE_AI_API_KEY: optionalKey,
})

export type Env = z.infer<typeof envSchema>

let cached: Env | undefined

// ビルド時には環境変数がそろっていないことがあるため、最初に使うときに検証する
export function getEnv(source: Record<string, string | undefined> = process.env): Env {
  if (source === process.env && cached) return cached

  const result = envSchema.safeParse(source)
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`環境変数が不正です: ${names}`)
  }

  if (source === process.env) cached = result.data
  return result.data
}
