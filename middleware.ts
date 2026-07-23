import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'nr18_session'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)

  if (path.startsWith('/auth')) {
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/master/:path*', '/consultoria/:path*', '/dashboard/:path*', '/auth/:path*'],
}
