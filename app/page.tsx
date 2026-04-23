import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { POST_LOGIN_DEFAULT } from '@/lib/auth/paths'

export const dynamic = 'force-dynamic'

/**
 * `/`：middleware でも分岐するが、ミス時の最終的な導線としても
 * ログイン済 → 一覧、未ログイン → `/login`。
 */
export default async function HomePage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/login')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect(POST_LOGIN_DEFAULT)
  }
  redirect('/login')
}
