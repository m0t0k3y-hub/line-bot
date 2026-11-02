import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, type LanguageModel, type ModelMessage } from 'ai'

import type { PersonaVersion, Provider } from '@/db/schema'
import { getEnv } from '@/lib/env'

function apiKeyFor(provider: Provider): string | undefined {
  const env = getEnv()
  switch (provider) {
    case 'anthropic':
      return env.ANTHROPIC_API_KEY
    case 'openai':
      return env.OPENAI_API_KEY
    case 'google':
      return env.GOOGLE_GENERATIVE_AI_API_KEY
  }
}

export function isProviderAvailable(provider: Provider): boolean {
  return apiKeyFor(provider) !== undefined
}

function getModel(provider: Provider, modelId: string): LanguageModel {
  const apiKey = apiKeyFor(provider)
  if (!apiKey) throw new Error(`${provider} の API キーが設定されていません`)

  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId)
    case 'openai':
      return createOpenAI({ apiKey })(modelId)
    case 'google':
      return createGoogle({ apiKey })(modelId)
  }
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export type ReplyResult = {
  text: string
  inputTokens: number | undefined
  outputTokens: number | undefined
  latencyMs: number
}

type PersonaConfig = Pick<
  PersonaVersion,
  'systemPrompt' | 'fewShots' | 'provider' | 'model' | 'maxOutputTokens' | 'providerOptions'
>

export async function generateReply(
  persona: PersonaConfig,
  history: ChatTurn[],
  { timeoutMs }: { timeoutMs: number },
): Promise<ReplyResult> {
  const fewShots: ModelMessage[] = persona.fewShots.flatMap((shot) => [
    { role: 'user' as const, content: shot.user },
    { role: 'assistant' as const, content: shot.assistant },
  ])

  const startedAt = Date.now()
  const result = await generateText({
    model: getModel(persona.provider, persona.model),
    instructions: persona.systemPrompt,
    messages: [...fewShots, ...history],
    maxOutputTokens: persona.maxOutputTokens,
    providerOptions: { [persona.provider]: persona.providerOptions as never },
    timeout: timeoutMs,
  })

  const text = result.text.trim()
  if (!text) throw new Error(`空の返答が返されました（finishReason: ${result.finishReason}）`)

  return {
    text,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    latencyMs: Date.now() - startedAt,
  }
}
