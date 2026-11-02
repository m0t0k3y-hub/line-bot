import { z } from 'zod'

// 各フェーズで必要になった変数をここに追加していく
const envSchema = z.object({
  DATABASE_URL: z.url(),
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
