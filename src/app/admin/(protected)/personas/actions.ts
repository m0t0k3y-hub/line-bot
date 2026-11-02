'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireAdmin } from '@/admin/auth'
import { providerLabels } from '@/lib/providers'
import { isProviderAvailable } from '@/llm'
import {
  formatIssues,
  isSameConfig,
  type PersonaConfig,
  type PersonaConfigForm,
  personaConfigFormSchema,
} from '@/personas/config'
import {
  archivePersona,
  createPersona,
  createVersion,
  getPersona,
  getPersonaUsage,
  getVersion,
  setCurrentVersion,
  updatePersonaMeta,
} from '@/personas/store'

export type ActionState = { error?: string; success?: string }

const metaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内にしてください'),
  description: z.string().trim().max(1000, '説明は1000文字以内にしてください'),
})

export type SavePersonaPayload = {
  personaId?: string
  name: string
  description: string
  config: PersonaConfigForm
  note: string
}

function parseConfig(form: PersonaConfigForm): { config?: PersonaConfig; error?: string } {
  const parsed = personaConfigFormSchema.safeParse(form)
  if (!parsed.success) return { error: formatIssues(parsed.error) }
  if (!isProviderAvailable(parsed.data.provider)) {
    return { error: `${providerLabels[parsed.data.provider]} の API キーが設定されていません` }
  }
  return { config: parsed.data }
}

/** 新規作成なら1版目を作って編集画面へ、編集なら新しい版を作る */
export async function savePersonaAction(payload: SavePersonaPayload): Promise<ActionState> {
  const admin = await requireAdmin()

  const { config, error } = parseConfig(payload.config)
  if (!config) return { error }
  const note = payload.note.trim()

  if (!payload.personaId) {
    const meta = metaSchema.safeParse(payload)
    if (!meta.success) return { error: formatIssues(meta.error) }
    const id = await createPersona({ ...meta.data, config, note, createdBy: admin.id })
    redirect(`/admin/personas/${id}`)
  }

  const persona = await getPersona(payload.personaId)
  if (!persona) return { error: 'ペルソナが見つかりません' }
  if (persona.currentVersion && isSameConfig(persona.currentVersion, config)) {
    return { error: '現行版から変更がありません' }
  }

  await createVersion(persona.id, config, { note, createdBy: admin.id })
  refresh()
  return { success: '新しい版として保存し、現行版にしました' }
}

export async function updateMetaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()

  const meta = metaSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })
  if (!meta.success) return { error: formatIssues(meta.error) }

  await updatePersonaMeta(String(formData.get('id')), meta.data)
  refresh()
  return { success: '保存しました' }
}

export async function duplicatePersonaAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const source = await getPersona(String(formData.get('id')))
  if (!source?.currentVersion) return

  const version = source.currentVersion
  const id = await createPersona({
    name: `${source.name}のコピー`,
    description: source.description,
    config: version,
    note: `「${source.name}」の版${version.versionNo}から複製`,
    createdBy: admin.id,
  })
  redirect(`/admin/personas/${id}`)
}

export async function archivePersonaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()

  const id = String(formData.get('id'))
  const usage = await getPersonaUsage(id)
  if (usage) return { error: `削除できません：${usage}` }

  await archivePersona(id)
  refresh()
  return {}
}

export async function setCurrentVersionAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const personaId = String(formData.get('personaId'))
  const version = await getVersion(personaId, String(formData.get('versionId')))
  if (!version) return

  await setCurrentVersion(personaId, version.id)
  refresh()
}

/** 過去の版の内容をコピーした新しい版を作る。履歴は消さない */
export async function restoreVersionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const personaId = String(formData.get('personaId'))
  const version = await getVersion(personaId, String(formData.get('versionId')))
  if (!version) return

  await createVersion(personaId, version, {
    note: `版${version.versionNo}から戻した`,
    createdBy: admin.id,
  })
  refresh()
}
