import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'

async function requireGestor(req: Request) {
  const userId = getSessionUserIdFromRequest(req)
  if (!userId) return null
  const current = await prisma.avaliador.findUnique({ where: { id: userId } })
  if (!current?.consultoriaId || current.role !== 'gestor') return null
  return current
}

export async function GET(req: Request) {
  try {
    const current = await requireGestor(req)
    if (!current) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }
    const consultoriaId = current.consultoriaId
    if (!consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const [consultoria, avaliadores, vistorias] = await Promise.all([
      prisma.consultoria.findUnique({ where: { id: consultoriaId } }),
      prisma.avaliador.findMany({ where: { consultoriaId }, orderBy: { fullName: 'asc' } }),
      prisma.vistoria.findMany({
        where: { consultoriaId },
        select: { id: true, status: true, avaliadorId: true },
      }),
    ])

    return NextResponse.json({
      consultoria,
      avaliadores: avaliadores.map(avaliador => ({
        id: avaliador.id,
        full_name: avaliador.fullName,
        email: avaliador.email,
        role: avaliador.role,
        tipo_registro: avaliador.tipo_registro,
        registro_mte: avaliador.registro_mte,
        crea: avaliador.crea,
        phone: null,
        active: avaliador.active,
        vistorias: vistorias
          .filter(vistoria => vistoria.avaliadorId === avaliador.id)
          .map(({ id, status }) => ({ id, status })),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar avaliadores' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const current = await requireGestor(req)
    if (!current) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    const consultoriaId = current.consultoriaId
    if (!consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const body = await req.json()
    const fullName = String(body.full_name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    const existing = await prisma.authUser.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })

    const now = new Date()
    const avaliador = await prisma.$transaction(async tx => {
      const user = await tx.authUser.create({
        data: { email, passwordHash: hashPassword(password) },
      })
      return tx.avaliador.create({
        data: {
          id: user.id,
          consultoriaId,
          fullName,
          email,
          role: 'avaliador',
          active: body.active !== false,
          updated_at: now,
        },
      })
    })

    return NextResponse.json({ avaliador })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao cadastrar avaliador' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const current = await requireGestor(req)
    if (!current) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    const consultoriaId = current.consultoriaId
    if (!consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const body = await req.json()
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const avaliador = await prisma.avaliador.findFirst({
      where: { id, consultoriaId },
    })
    if (!avaliador) return NextResponse.json({ error: 'Avaliador não encontrado' }, { status: 404 })
    if (avaliador.role === 'gestor') {
      return NextResponse.json({ error: 'O gestor da consultoria deve ser alterado pelo Master' }, { status: 403 })
    }

    const fullName = body.full_name !== undefined ? String(body.full_name || '').trim() : undefined
    const email = body.email !== undefined ? String(body.email || '').trim().toLowerCase() : undefined
    const password = body.password !== undefined ? String(body.password || '') : undefined

    if (fullName !== undefined && !fullName) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (email !== undefined && !email) return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
    if (password && password.length < 6) return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })

    if (email && email !== avaliador.email) {
      const existing = await prisma.authUser.findUnique({ where: { email } })
      if (existing && existing.id !== avaliador.id) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
      }
    }

    await prisma.$transaction(async tx => {
      if (email || password) {
        await tx.authUser.update({
          where: { id: avaliador.id },
          data: {
            ...(email && { email }),
            ...(password && { passwordHash: hashPassword(password) }),
          },
        })
      }

      await tx.avaliador.update({
        where: { id: avaliador.id },
        data: {
          ...(fullName !== undefined && { fullName }),
          ...(email && { email }),
          ...(body.active !== undefined && { active: Boolean(body.active) }),
          updated_at: new Date(),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao atualizar avaliador' }, { status: 500 })
  }
}
