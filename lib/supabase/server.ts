import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * サーバー（Server Component / Route Handler / Server Action）専用。
 * Cookie 経由で Supabase セッションを読み書きする。
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // 一部の Server コンテキストでは set ができない
          }
        },
      },
    }
  )
}
