import { requireAdmin } from '@/admin/auth'
import { modelSuggestions, providers } from '@/lib/providers'
import { isProviderAvailable } from '@/llm'
import { PersonaEditor } from '../persona-editor'

export default async function NewPersonaPage() {
  await requireAdmin()
  const availableProviders = providers.filter(isProviderAvailable)
  const provider = availableProviders[0] ?? 'google'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">ペルソナの新規作成</h1>
      <PersonaEditor
        mode="create"
        availableProviders={availableProviders}
        initialConfig={{
          systemPrompt: '',
          fewShots: [],
          provider,
          model: modelSuggestions[provider][0]?.id ?? '',
          maxOutputTokens: '2048',
          providerOptions: '',
        }}
      />
    </div>
  )
}
