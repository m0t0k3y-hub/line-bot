import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireAdmin } from '@/admin/auth'
import { hintClass, secondaryButtonClass } from '@/app/admin/ui'
import { providerLabels } from '@/lib/providers'
import { diffConfigs } from '@/personas/diff'
import { getPersona, listVersions } from '@/personas/store'
import { getVersionFeedbackStats } from '@/feedbacks/store'
import { RestoreVersionButton, SetCurrentVersionButton } from '../../persona-buttons'

export const instant = false

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tokyo',
})

export default async function VersionsPage({
  params,
  searchParams,
}: PageProps<'/admin/personas/[id]/versions'>) {
  await requireAdmin()
  const { id } = await params
  const persona = await getPersona(id)
  if (!persona) notFound()

  const versions = await listVersions(id)
  const stats = await getVersionFeedbackStats(versions.map((v) => v.id))
  const query = await searchParams
  // 比べる2つの版。指定がなければ、現行版とその1つ前を比べる
  const currentIndex = Math.max(
    0,
    versions.findIndex((v) => v.id === persona.currentVersionId),
  )
  const after = versions.find((v) => v.id === query.b) ?? versions[currentIndex]
  const before =
    versions.find((v) => v.id === query.a) ??
    versions.find((v) => after && v.versionNo < after.versionNo)

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold">{persona.name}：版の履歴</h1>
        <Link href={`/admin/personas/${id}`} className="text-sm hover:underline">
          編集に戻る
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">違いを比べる</h2>
        <form className="flex flex-wrap items-center gap-2 text-sm">
          <VersionSelect name="a" versions={versions} selected={before?.id} />
          <span>→</span>
          <VersionSelect name="b" versions={versions} selected={after?.id} />
          <button type="submit" className={secondaryButtonClass}>
            比べる
          </button>
        </form>
        {before && after ? (
          <VersionDiff before={before} after={after} />
        ) : (
          <p className={hintClass}>比べられる版がまだありません。</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">版の一覧</h2>
        <ul className="space-y-2">
          {versions.map((version) => {
            const isCurrent = version.id === persona.currentVersionId
            return (
              <li
                key={version.id}
                className="space-y-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">版{version.versionNo}</span>
                  {isCurrent && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">
                      現行版
                    </span>
                  )}
                  <span className={hintClass}>
                    {dateFormat.format(version.createdAt)}・{version.author ?? '—'}・
                    {providerLabels[version.provider]} {version.model}・LINE での返答{' '}
                    {version.replyCount} 件
                  </span>
                </div>
                <VersionStats stats={stats.get(version.id)} versionId={version.id} />
                {version.note && <p className="text-sm">{version.note}</p>}
                {!isCurrent && (
                  <div className="flex flex-wrap gap-3 text-sm">
                    <SetCurrentVersionButton personaId={id} versionId={version.id} />
                    <RestoreVersionButton
                      personaId={id}
                      versionId={version.id}
                      versionNo={version.versionNo}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function VersionStats(props: {
  stats: { up: number; down: number } | undefined
  versionId: string
}) {
  const { up = 0, down = 0 } = props.stats ?? {}
  if (up + down === 0) return <p className={hintClass}>評価はまだありません</p>
  return (
    <p className="text-sm">
      👍 {up}・👎 {down}（👍の割合 {Math.round((up / (up + down)) * 100)}%）{' '}
      <Link
        href={`/admin/feedbacks?version=${props.versionId}`}
        className="text-xs hover:underline"
      >
        評価を見る
      </Link>
    </p>
  )
}

function VersionSelect(props: {
  name: string
  versions: { id: string; versionNo: number }[]
  selected: string | undefined
}) {
  return (
    <select
      name={props.name}
      defaultValue={props.selected}
      className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
    >
      {props.versions.map((v) => (
        <option key={v.id} value={v.id}>
          版{v.versionNo}
        </option>
      ))}
    </select>
  )
}

function VersionDiff(props: {
  before: Parameters<typeof diffConfigs>[0] & { versionNo: number }
  after: Parameters<typeof diffConfigs>[1] & { versionNo: number }
}) {
  const sections = diffConfigs(props.before, props.after)

  return (
    <div className="space-y-4">
      <p className={hintClass}>
        <span className="bg-red-100 px-1 dark:bg-red-950">
          版{props.before.versionNo}にだけある行
        </span>{' '}
        <span className="bg-green-100 px-1 dark:bg-green-950">
          版{props.after.versionNo}にだけある行
        </span>
      </p>
      {sections.map((section) => (
        <div key={section.label} className="space-y-1">
          <h3 className="text-sm font-medium">
            {section.label}
            {!section.changed && <span className={`ml-2 ${hintClass}`}>変更なし</span>}
          </h3>
          {section.changed && (
            <pre className="overflow-x-auto rounded-md border border-zinc-200 p-3 text-xs leading-relaxed whitespace-pre-wrap dark:border-zinc-800">
              {section.parts.map((part, i) => (
                <span
                  key={i}
                  className={
                    part.kind === 'added'
                      ? 'block bg-green-100 dark:bg-green-950'
                      : part.kind === 'removed'
                        ? 'block bg-red-100 line-through decoration-red-400 dark:bg-red-950'
                        : 'block text-zinc-500'
                  }
                >
                  {part.text}
                </span>
              ))}
            </pre>
          )}
        </div>
      ))}
    </div>
  )
}
