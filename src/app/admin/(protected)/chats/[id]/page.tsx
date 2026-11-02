import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireAdmin } from '@/admin/auth'
import { hintClass } from '@/app/admin/ui'
import { getSettings } from '@/bot/store'
import { getChat, listPersonaOptions } from '@/chats/store'
import { chatTypeLabels } from '../labels'
import { ChatSettingsForm } from './chat-settings-form'

const toText = (value: number | null) => (value === null ? '' : String(value))

export default async function ChatPage({ params }: PageProps<'/admin/chats/[id]'>) {
  await requireAdmin()
  const { id } = await params
  const [chat, settings, personaOptions] = await Promise.all([
    getChat(id),
    getSettings(),
    listPersonaOptions(),
  ])
  if (!chat) notFound()

  const defaultPersonaName =
    personaOptions.find((p) => p.id === settings.defaultPersonaId)?.name ?? '未設定'
  const dailyLimit = chat.dailyLimit ?? settings.dailyLimit

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/chats" className="text-sm hover:underline">
          ← トーク・グループの一覧
        </Link>
        <h1 className="text-xl font-semibold">{chat.name || '（名前なし）'}</h1>
        <p className={hintClass}>
          {chatTypeLabels[chat.type]}・{chat.active ? '参加中' : '退出済み'}・今日の返信{' '}
          {chat.todayCount} / {dailyLimit}
        </p>
      </div>

      <ChatSettingsForm
        chatId={chat.id}
        isGroup={chat.type !== 'user'}
        personaOptions={personaOptions}
        initial={{
          // 削除済みのペルソナが割り当てられていたら、選び直してもらう
          personaId: personaOptions.some((p) => p.id === chat.personaId)
            ? (chat.personaId ?? '')
            : '',
          replyMode: chat.replyMode,
          keywords: chat.keywords.join('\n'),
          historyTurns: toText(chat.historyTurns),
          historyMaxMessages: toText(chat.historyMaxMessages),
          dailyLimit: toText(chat.dailyLimit),
          limitMessage: chat.limitMessage ?? '',
        }}
        defaults={{
          personaName: defaultPersonaName,
          historyTurns: settings.historyTurns,
          historyMaxMessages: settings.historyMaxMessages,
          dailyLimit: settings.dailyLimit,
          limitMessage: settings.limitMessage,
        }}
      />
    </div>
  )
}
