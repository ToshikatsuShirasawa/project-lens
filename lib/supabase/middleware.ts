import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSafeNextPath, isGuestAllowedPathname, POST_LOGIN_DEFAULT } from '@/lib/auth/paths'

/**
 * Supabase セッションのリフレッシュに加え、
 * - `/` → 未ログインは `/login`、ログイン済は `/projects`
 * - ゲストのログイン必須 UI → `/login?next=...`
 * - ログイン済が `/login`・`/signup` へ来たら `next` または `/projects` へ
 * API 本体の 401 は Route Handler で扱い、Cookie 更新との整合を保つ。
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const { data: userResult } = await supabase.auth.getUser()
  const user = userResult.user

  const url = request.nextUrl.clone()
  const { pathname, search } = url
  const pathWithQuery = `${pathname}${search || ''}`

  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL(POST_LOGIN_DEFAULT, request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const next = url.searchParams.get('next')
    return NextResponse.redirect(
      new URL(getSafeNextPath(next, POST_LOGIN_DEFAULT), request.url)
    )
  }

  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  if (!user && !isGuestAllowedPathname(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathWithQuery)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
