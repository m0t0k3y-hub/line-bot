import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireAdmin } from '@/admin/auth'
import { providers } from '@/lib/providers'
import { isProviderAvailable } from '@/llm'
import { toConfigForm } from '@/personas/config'
import { getPersona } from '@/personas/store'
import { PersonaEditor } from '../persona-editor'
import { PersonaMetaForm } from './meta-form'

export default async function EditPersonaPage({ params }: PageProps<'/admin/personas/[id]'>) {
  await requireAdmin()
  const { id } = await params
  const persona = await getPersona(id)
  if (!persona?.currentVersion) notFound()

  const version = persona.currentVersion

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold">{persona.name}</h1>
        <span className="text-sm text-zinc-500">現行版：版{version.versionNo}</span>
        <Link href={`/admin/personas/${id}/versions`} className="text-sm hover:underline">
          版の履歴を見る
        </Link>
      </div>

      <PersonaMetaForm id={id} name={persona.name} description={persona.description} />

      <PersonaEditor
        mode="edit"
        personaId={id}
        currentVersionNo={version.versionNo}
        availableProviders={providers.filter(isProviderAvailable)}
        initialConfig={toConfigForm(version)}
      />
    </div>
  )
}
