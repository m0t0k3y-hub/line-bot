import Link from 'next/link'

import { requireAdmin } from '@/admin/auth'
import { hintClass, primaryButtonClass } from '@/app/admin/ui'
import { providerLabels } from '@/lib/providers'
import { listPersonas } from '@/personas/store'
import { ArchivePersonaButton, DuplicatePersonaButton } from './persona-buttons'

export default async function PersonasPage() {
  await requireAdmin()
  const personas = await listPersonas()

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ペルソナ</h1>
        <Link href="/admin/personas/new" className={primaryButtonClass}>
          新規作成
        </Link>
      </div>

      <ul className="space-y-3">
        {personas.map((persona) => (
          <li
            key={persona.id}
            className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/personas/${persona.id}`} className="font-medium hover:underline">
                {persona.name}
              </Link>
              {persona.isDefault && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  標準
                </span>
              )}
              {persona.chatCount > 0 && (
                <span className={hintClass}>{persona.chatCount} 件のトークに割り当て</span>
              )}
            </div>
            {persona.description && <p className="text-sm">{persona.description}</p>}
            {persona.currentVersion && (
              <p className={hintClass}>
                版{persona.currentVersion.versionNo}・
                {providerLabels[persona.currentVersion.provider]}・{persona.currentVersion.model}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/admin/personas/${persona.id}`} className="hover:underline">
                編集
              </Link>
              <Link href={`/admin/personas/${persona.id}/versions`} className="hover:underline">
                版の履歴
              </Link>
              <DuplicatePersonaButton id={persona.id} />
              <ArchivePersonaButton id={persona.id} name={persona.name} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
