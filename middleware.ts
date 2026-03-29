import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // These routes are always public — never redirect
  const { pathname } = req.nextUrl
  if (
    pathname.startsWith('/view/') ||
    pathname.startsWith('/verify/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/'
  ) {
    return res
  }

  // For app routes, check auth
  try {
    const supabase = createMiddlewareClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session && pathname.startsWith('/dashboard') || !session && pathname.startsWith('/documents') || !session && pathname.startsWith('/onboarding') || !session && pathname.startsWith('/settings')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  } catch (e) {
    // If supabase fails, let through — page will handle auth
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
