import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  clearSessionCookie,
  createSessionToken,
  getCurrentUser,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from '@/lib/local-auth'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.action === 'signInWithPassword') {
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const authUser = await prisma.auth_users.findUnique({ where: { email } })

      if (!authUser || !verifyPassword(password, authUser.password_hash)) {
        return json({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }, 401)
      }

      const token = createSessionToken(authUser.id, authUser.email)
      setSessionCookie(token)
      return json({ data: { user: { id: authUser.id, email: authUser.email }, session: { access_token: token } }, error: null })
    }

    if (body.action === 'signUp') {
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!email || !password) return json({ data: { user: null, session: null }, error: { message: 'Informe e-mail e senha' } }, 400)
      if (password.length < 6) return json({ data: { user: null, session: null }, error: { message: 'Senha deve ter no mínimo 6 caracteres' } }, 400)

      const exists = await prisma.auth_users.findUnique({ where: { email } })
      if (exists) return json({ data: { user: null, session: null }, error: { message: 'User already registered' } }, 409)

      const authUser = await prisma.auth_users.create({
        data: { email, password_hash: hashPassword(password) },
        select: { id: true, email: true },
      })
      const token = createSessionToken(authUser.id, authUser.email)
      setSessionCookie(token)
      return json({ data: { user: authUser, session: { access_token: token } }, error: null })
    }

    if (body.action === 'signOut') {
      clearSessionCookie()
      return json({ data: null, error: null })
    }

    return json({ error: { message: 'Ação de autenticação inválida' } }, 400)
  } catch (err: any) {
    return json({ data: null, error: { message: err.message || 'Erro de autenticação' } }, 500)
  }
}

export async function GET() {
  const user = await getCurrentUser()
  return json({ data: { user }, error: null })
}
