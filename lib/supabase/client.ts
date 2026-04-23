import { createBrowserClient } from '@supabase/ssr'

/**
 * ブラウザ（Client Component）専用。`NEXT_PUBLIC_SUPABASE_*` を参照する。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
