import type { User as SupabaseUser } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import type { User } from '@/lib/generated/prisma/client'

function pickName(userMetadata: SupabaseUser['user_metadata']): string | null {
  if (!userMetadata || typeof userMetadata !== 'object') return null
  const name = userMetadata['name']
  if (typeof name === 'string' && name.trim()) return name.trim()
  const fullName = userMetadata['full_name']
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()
  return null
}

/**
 * Supabase Auth ユーザーに対応する `users` 行を upsert する（初回ログイン同期）。
 */
export async function ensureAppUserFromAuthUser(supabaseUser: SupabaseUser): Promise<User> {
  const id = supabaseUser.id
  const email = supabaseUser.email?.trim()
  if (!id || !email) {
    throw new Error('Auth ユーザーに id または email がありません')
  }
  const name = pickName(supabaseUser.user_metadata)
  return prisma.user.upsert({
    where: { id },
    create: { id, email, name },
    update: { email, name },
  })
}
