import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const userIdCookie = cookieHeader.split('; ').find(row => row.startsWith('auth_user_id='))?.split('=')[1]

    if (!userIdCookie) {
      return NextResponse.json({ user: null })
    }

    const user = await prisma.authUser.findUnique({
      where: { id: userIdCookie },
      include: { avaliador: { include: { consultoria: true } } }
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    const master = await prisma.masterAdmin.findUnique({ where: { email: user.email } })

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      master: !!master,
      avaliador: user.avaliador
    })
  } catch (error: any) {
    return NextResponse.json({ user: null })
  }
}

export async function POST(req: Request) {
  try {
    const { action, email, password } = await req.json()

    if (action === 'logout') {
      const response = NextResponse.json({ success: true })
      response.cookies.set('auth_user_id', '', { expires: new Date(0), path: '/' })
      return response
    }

    if (action === 'login') {
      const user = await prisma.authUser.findUnique({
        where: { email },
        include: { avaliador: { include: { consultoria: true } } }
      })

      if (!user || user.passwordHash !== password) {
        return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
      }

      const isMaster = await prisma.masterAdmin.findUnique({ where: { email } })

      const response = NextResponse.json({
        user: { id: user.id, email: user.email },
        master: !!isMaster,
        avaliador: user.avaliador
      })

      response.cookies.set('auth_user_id', user.id, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      })

      return response
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
