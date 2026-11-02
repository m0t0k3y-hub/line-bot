import { requireAdmin } from '@/admin/auth'
import { getSettings } from '@/bot/store'
import { listPersonaOptions } from '@/chats/store'
import { SettingsForm } from './settings-form'

export const instant = false

export default async function SettingsPage() {
  await requireAdmin()
  const [settings, personaOptions] = await Promise.all([getSettings(), listPersonaOptions()])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">全体の設定</h1>
      <SettingsForm
        personaOptions={personaOptions}
        initial={{
          defaultPersonaId: personaOptions.some((p) => p.id === settings.defaultPersonaId)
            ? (settings.defaultPersonaId ?? '')
            : '',
          historyTurns: String(settings.historyTurns),
          historyMaxMessages: String(settings.historyMaxMessages),
          dailyLimit: String(settings.dailyLimit),
          limitMessage: settings.limitMessage,
          errorMessage: settings.errorMessage,
          llmTimeoutSec: String(settings.llmTimeoutSec),
          feedbackAckEnabled: String(settings.feedbackAckEnabled),
          feedbackAckMessage: settings.feedbackAckMessage,
        }}
      />
    </div>
  )
}
