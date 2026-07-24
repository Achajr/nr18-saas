import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Passa todas as requisições sem depender do Supabase
  return NextResponse.next()
}

export const config = {
  matcher: ['/master/:path*', '/consultoria/:path*', '/dashboard/:path*', '/auth/:path*']
}
