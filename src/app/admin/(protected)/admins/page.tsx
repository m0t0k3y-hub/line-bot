import { requireAdmin } from '@/admin/auth'
import { listAdmins } from '@/admin/store'
import { AddAdminForm, RemoveAdminButton } from './forms'

const dateFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeZone: 'Asia/Tokyo' })

export default async function AdminsPage() {
  const me = await requireAdmin()
  const admins = await listAdmins()
  const nameById = new Map(admins.map((admin) => [admin.id, admin.name || admin.email]))

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">管理者</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">管理者を追加</h2>
        <p className="text-sm text-zinc-500">
          Google アカウントのメールアドレスを登録すると、その人がログインできるようになります。
          Google Cloud の OAuth 同意画面が「テスト中」の場合は、テストユーザーにも追加してください。
        </p>
        <AddAdminForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">登録済み（{admins.length}人）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="py-2 pr-4 font-normal">メールアドレス</th>
                <th className="py-2 pr-4 font-normal">名前</th>
                <th className="py-2 pr-4 font-normal">追加日</th>
                <th className="py-2 pr-4 font-normal">追加した人</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4">{admin.email}</td>
                  <td className="py-2 pr-4">{admin.name || '（未ログイン）'}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {dateFormat.format(admin.createdAt)}
                  </td>
                  <td className="py-2 pr-4">
                    {admin.createdBy ? (nameById.get(admin.createdBy) ?? '（削除済み）') : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {admin.id === me.id ? (
                      <span className="text-xs text-zinc-400">あなた</span>
                    ) : (
                      <RemoveAdminButton id={admin.id} email={admin.email} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
