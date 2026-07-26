import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { clearAuthCookies, getSessionUserIdFromRequest, setAuthCookies } from '@/lib/auth/session'
import { hashPassword, needsPasswordRehash, verifyPassword } from '@/lib/auth/password'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ user: null })
    }

    const user = await prisma.authUser.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    const [master, avaliador] = await Promise.all([
      prisma.masterAdmin.findFirst({ where: { email: user.email, active: true } }),
      prisma.avaliador.findUnique({ where: { id: user.id } }),
    ])

    const consultoria = avaliador?.consultoriaId
      ? await prisma.consultoria.findUnique({ where: { id: avaliador.consultoriaId } })
      : null

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      master: !!master,
      avaliador: avaliador ? { ...avaliador, consultoria } : null,
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, email, password } = body

    if (action === 'logout') {
      const response = NextResponse.json({ success: true })
      clearAuthCookies(response)
      return response
    }

    if (action === 'login') {
      const user = await prisma.authUser.findUnique({
        where: { email },
      })

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
      }

      if (needsPasswordRehash(user.passwordHash)) {
        await prisma.authUser.update({
          where: { id: user.id },
          data: { passwordHash: hashPassword(password) },
        })
      }

      const [isMaster, avaliador] = await Promise.all([
        prisma.masterAdmin.findFirst({ where: { email, active: true } }),
        prisma.avaliador.findUnique({ where: { id: user.id } }),
      ])

      const consultoria = avaliador?.consultoriaId
        ? await prisma.consultoria.findUnique({ where: { id: avaliador.consultoriaId } })
        : null

      const response = NextResponse.json({
        user: { id: user.id, email: user.email },
        master: !!isMaster,
        avaliador: avaliador ? { ...avaliador, consultoria } : null,
      })

      setAuthCookies(response, user.id)

      return response
    }

    if (action === 'register') {
      const fullName = String(body.full_name || '').trim()
      const orgName = String(body.org_name || '').trim()
      const role = String(body.role || 'avaliador')
      const now = new Date()

      if (!fullName || !email || !password || !orgName) {
        return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
      }

      if (String(password).length < 6) {
        return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
      }

      const existing = await prisma.authUser.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
      }

      const result = await prisma.$transaction(async tx => {
        const user = await tx.authUser.create({
          data: { email, passwordHash: hashPassword(password) },
        })

        const consultoria = await tx.consultoria.create({
          data: {
            name: orgName,
            cnpj: body.org_cnpj || null,
            email,
            responsavel_nome: fullName,
            responsavel_email: email,
            plan: 'pro',
            max_avaliadores: 5,
            max_empresas: 30,
            max_obras: 999,
            active: true,
            created_by: user.id,
            updated_at: now,
          },
        })

        const avaliador = await tx.avaliador.create({
          data: {
            id: user.id,
            consultoriaId: consultoria.id,
            fullName,
            email,
            role,
            tipo_registro: body.tipo_registro || null,
            registro_mte: body.registro_mte || null,
            crea: body.crea || null,
            active: true,
            updated_at: now,
          },
        })

        return { user, consultoria, avaliador }
      })

      const response = NextResponse.json({
        user: { id: result.user.id, email: result.user.email },
        master: false,
        avaliador: { ...result.avaliador, consultoria: result.consultoria },
      })
      setAuthCookies(response, result.user.id)
      return response
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao autenticar' }, { status: 500 })
  }
}
