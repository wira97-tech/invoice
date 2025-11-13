import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('Middleware session check:', session?.user?.email || 'No session', 'for path:', req.nextUrl.pathname)

  // Redirect to login if accessing protected routes without session
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('No session, redirecting to login')
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('message', 'Please sign in to access the dashboard')
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to dashboard if accessing auth routes with session (except logout)
  if (session && req.nextUrl.pathname.startsWith('/auth/') && !req.nextUrl.pathname.includes('/logout')) {
    console.log('Has session, redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  console.log('Middleware: allowing access')
  return res
}

export const config = {
  matcher: ['/auth/:path*']
}