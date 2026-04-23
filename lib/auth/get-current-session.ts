import { createClient } from '@/lib/supabase/server'
import { ensureAppUserFromAuthUser } from '@/lib/auth/ensure-app-user'
import type { User } from '@/lib/generated/prisma/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/**
 * セッションがあれば Prisma `User` まで解決（未同期なら upsert）。
 * 未ログインは null。
 */
export type CurrentSessionContext = {
  auth: SupabaseUser
  appUser: User
}

export async function getCurrentSessionContext(): Promise<CurrentSessionContext | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return null
  }
  const appUser = await ensureAppUserFromAuthUser(data.user)
  return { auth: data.user, appUser }
}
