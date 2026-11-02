'use server'

import { refresh } from 'next/cache'

import { requireAdmin } from '@/admin/auth'
import { chatSettingsSchema, globalSettingsSchema } from '@/chats/settings'
import {
  getChat,
  listPersonaOptions,
  updateChatSettings,
  updateGlobalSettings,
} from '@/chats/store'
import { formatIssues } from '@/personas/config'

export type ActionState = { error?: string; success?: string }

async function isSelectablePersona(id: string | null): Promise<boolean> {
  if (id === null) return true
  return (await listPersonaOptions()).some((persona) => persona.id === id)
}

export async function updateChatSettingsAction(
  id: string,
  form: Record<string, string>,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = chatSettingsSchema.safeParse(form)
  if (!parsed.success) return { error: formatIssues(parsed.error) }
  if (!(await isSelectablePersona(parsed.data.personaId))) {
    return { error: '選んだペルソナが見つかりません' }
  }
  if (!(await getChat(id))) return { error: 'トーク・グループが見つかりません' }

  await updateChatSettings(id, parsed.data)
  refresh()
  return { success: '保存しました' }
}

export async function updateGlobalSettingsAction(
  form: Record<string, string>,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = globalSettingsSchema.safeParse(form)
  if (!parsed.success) return { error: formatIssues(parsed.error) }
  if (!(await isSelectablePersona(parsed.data.defaultPersonaId))) {
    return { error: '選んだペルソナが見つかりません' }
  }

  await updateGlobalSettings(parsed.data)
  refresh()
  return { success: '保存しました' }
}
