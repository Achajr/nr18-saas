import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  // Rotas públicas não precisam inicializar o Supabase. Isso evita erro em
  // ambiente local antes de configurar NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.
  if (path.startsWith('/auth')) return res

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Sem sessão — manda para login
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Rota master
  if (path.startsWith('/master')) {
    const { data: master } = await supabase
      .from('master_admins')
      .select('id')
      .eq('id', session.user.id)
      .single()
    if (!master) return NextResponse.redirect(new URL('/consultoria', req.url))
    return res
  }

  // Rota consultoria
  if (path.startsWith('/consultoria')) {
    const { data: master } = await supabase
      .from('master_admins')
      .select('id')
      .eq('id', session.user.id)
      .single()
    if (master) return NextResponse.redirect(new URL('/master', req.url))

    const { data: avaliador } = await supabase
      .from('avaliadores')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (!avaliador || avaliador.role !== 'gestor') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res
  }

  // Rota dashboard
  if (path.startsWith('/dashboard')) {
    const { data: master } = await supabase
      .from('master_admins')
      .select('id')
      .eq('id', session.user.id)
      .single()
    if (master) return NextResponse.redirect(new URL('/master', req.url))

    const { data: avaliador } = await supabase
      .from('avaliadores')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (avaliador?.role === 'gestor') {
      return NextResponse.redirect(new URL('/consultoria', req.url))
    }
    return res
  }

  return res
}

export const config = {
  matcher: ['/master/:path*', '/consultoria/:path*', '/dashboard/:path*', '/auth/:path*']
}