import Link from 'next/link'

import { requireAdmin } from '@/admin/auth'
import { getSettings } from '@/bot/store'
import { listChats } from '@/chats/store'
import { hintClass } from '@/app/admin/ui'
import { chatTypeLabels, replyModeLabels } from './labels'

export default async function ChatsPage() {
  await requireAdmin()
  const [chats, settings] = await Promise.all([listChats(), getSettings()])

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold">トーク・グループ</h1>
      <p className={hintClass}>
        Bot が参加しているトークとグループです。今日の返信数は日本時間の 0:00 にリセットされます。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="py-2 pr-4 font-normal">名前</th>
              <th className="py-2 pr-4 font-normal">種類</th>
              <th className="py-2 pr-4 font-normal">ペルソナ</th>
              <th className="py-2 pr-4 font-normal">返信条件</th>
              <th className="py-2 pr-4 font-normal">今日の返信</th>
            </tr>
          </thead>
          <tbody>
            {chats.map((chat) => (
              <tr
                key={chat.id}
                className={`border-b border-zinc-100 dark:border-zinc-900 ${chat.active ? '' : 'text-zinc-400'}`}
              >
                <td className="py-2 pr-4">
                  <Link href={`/admin/chats/${chat.id}`} className="hover:underline">
                    {chat.name || '（名前なし）'}
                  </Link>
                  {!chat.active && <span className="ml-2 text-xs">退出済み</span>}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">{chatTypeLabels[chat.type]}</td>
                <td className="py-2 pr-4">
                  {chat.personaName
                    ? `${chat.personaName}${chat.personaArchived ? '（削除済み）' : ''}`
                    : '標準'}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {chat.type === 'user' ? '常に返信' : replyModeLabels[chat.replyMode]}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {chat.todayCount} / {chat.dailyLimit ?? settings.dailyLimit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {chats.length === 0 && (
          <p className={`mt-4 ${hintClass}`}>まだ Bot が参加しているトークはありません。</p>
        )}
      </div>
    </div>
  )
}
