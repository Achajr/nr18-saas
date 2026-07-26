import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthPage = pathname.startsWith('/auth')
  const hasSession = !!req.cookies.get('auth_session')?.value || !!req.cookies.get('auth_user_id')?.value

  if (!isAuthPage && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/master/:path*', '/consultoria/:path*', '/dashboard/:path*']
}
