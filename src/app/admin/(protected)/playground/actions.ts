'use server'

import { requireAdmin } from '@/admin/auth'
import { buildInstructions, cleanReply } from '@/bot/context'
import { getSettings } from '@/bot/store'
import { providerLabels } from '@/lib/providers'
import { type ChatTurn, generateReply, isProviderAvailable } from '@/llm'
import { formatIssues, type PersonaConfigForm, personaConfigFormSchema } from '@/personas/config'

export type PlaygroundContext = { type: 'user' | 'group'; speakerName: string }

export type PlaygroundResult =
  | {
      ok: true
      text: string
      inputTokens: number | undefined
      outputTokens: number | undefined
      latencyMs: number
    }
  | { ok: false; error: string }

const TEST_GROUP_NAME = 'テストグループ'

/**
 * 管理画面上でペルソナと会話する。会話は DB に保存しない（docs/spec.md「5.5」）。
 * LINE と同じく、会話の場所の補足を付け、グループでは発言に [表示名] を付けて渡す。
 */
export async function runPlaygroundAction(input: {
  config: PersonaConfigForm
  context: PlaygroundContext
  history: ChatTurn[]
}): Promise<PlaygroundResult> {
  await requireAdmin()

  const parsed = personaConfigFormSchema.safeParse(input.config)
  if (!parsed.success) return { ok: false, error: formatIssues(parsed.error) }
  const config = parsed.data
  if (!isProviderAvailable(config.provider)) {
    return {
      ok: false,
      error: `${providerLabels[config.provider]} の API キーが設定されていません`,
    }
  }

  const { type, speakerName } = input.context
  const chat = { type, name: type === 'group' ? TEST_GROUP_NAME : speakerName.trim() }
  const history = input.history.map((turn) =>
    type === 'group' && turn.role === 'user'
      ? { ...turn, content: `[${speakerName.trim() || 'だれか'}] ${turn.content}` }
      : turn,
  )

  try {
    const settings = await getSettings()
    const reply = await generateReply(
      { ...config, systemPrompt: buildInstructions(config.systemPrompt, chat) },
      history,
      { timeoutMs: settings.llmTimeoutSec * 1000 },
    )
    return { ok: true, ...reply, text: cleanReply(reply.text) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
