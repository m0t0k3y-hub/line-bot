import { requireAdmin } from '@/admin/auth'
import { hintClass, secondaryButtonClass } from '@/app/admin/ui'
import { toConfigForm } from '@/personas/config'
import { getPersona, getVersion, listPersonas, listVersions } from '@/personas/store'
import { PlaygroundWithConfig } from './playground-with-config'

export const instant = false

export default async function PlaygroundPage({ searchParams }: PageProps<'/admin/playground'>) {
  await requireAdmin()
  const query = await searchParams
  const personas = await listPersonas()

  const personaId = typeof query.persona === 'string' ? query.persona : personas[0]?.id
  const persona = personaId ? await getPersona(personaId) : undefined
  const versions = persona ? await listVersions(persona.id) : []
  const version =
    (persona && typeof query.version === 'string'
      ? await getVersion(persona.id, query.version)
      : undefined) ?? persona?.currentVersion

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">プレイグラウンド</h1>
      <p className={hintClass}>
        保存済みのペルソナと版を選んで試せます。保存前の内容を試すときは、ペルソナの編集画面を使ってください。
      </p>

      <form className="flex flex-wrap items-center gap-2 text-sm">
        <select
          name="persona"
          defaultValue={persona?.id}
          className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {persona && (
          <select
            name="version"
            defaultValue={version?.id}
            className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                版{v.versionNo}
                {v.id === persona.currentVersionId ? '（現行版）' : ''}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className={secondaryButtonClass}>
          切り替える
        </button>
      </form>

      {version ? (
        // 版を切り替えたら会話をリセットする
        <PlaygroundWithConfig key={version.id} config={toConfigForm(version)} />
      ) : (
        <p className={hintClass}>ペルソナがありません。</p>
      )}
    </div>
  )
}
