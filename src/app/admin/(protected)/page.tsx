import { requireAdmin } from '@/admin/auth'

export default async function DashboardPage() {
  const admin = await requireAdmin()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ダッシュボード</h1>
      <p className="text-sm">ようこそ、{admin.name || admin.email} さん。</p>
      <p className="text-sm text-zinc-500">返信数や評価の集計は、フェーズ6で表示する予定です。</p>
    </div>
  )
}
