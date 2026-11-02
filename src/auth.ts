import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

import { findAdminByEmail, insertAdmin, updateAdminName } from '@/admin/store'
import { getEnv } from '@/lib/env'

// AUTH_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET は Auth.js が環境変数から読む
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  // Vercel と localhost 以外では使わないので、Host ヘッダーを信頼する
  trustHost: true,
  pages: { signIn: '/admin/login', error: '/admin/login' },
  callbacks: {
    // admins に登録されたメールアドレスだけログインできる（docs/spec.md「5.1 認証」）
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase()
      if (!email || profile?.email_verified !== true) return false

      const initialAdminEmail = getEnv().INITIAL_ADMIN_EMAIL
      if (email === initialAdminEmail) {
        await insertAdmin({ email, name: profile.name ?? '' })
      }

      const admin = await findAdminByEmail(email)
      if (!admin) return false

      // 管理者の追加時は名前がないので、初回ログインで Google の名前を入れる
      if (!admin.name && profile.name) await updateAdminName(admin.id, profile.name)
      return true
    },
  },
})
