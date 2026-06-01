import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/login'
  const isDashboard = pathname.startsWith('/dashboard')

  if (!isLoginPage && !isDashboard) {
    return NextResponse.next()
  }

  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // getSession reads from the cookie — no network round-trip, so navigation is instant.
    // Individual server components call getUser() where they need validated user data.
    const { data: { session } } = await supabase.auth.getSession()

    if (!session && isDashboard) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (session && isLoginPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
  } catch {
    // If auth check fails, redirect dashboard to login and allow login page through
    if (isDashboard) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/login', '/dashboard/:path*'],
}
