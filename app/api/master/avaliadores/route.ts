import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'

async function requireMaster(req: Request) {
  const userId = getSessionUserIdFromRequest(req)
  if (!userId) return null
  const user = await prisma.authUser.findUnique({ where: { id: userId } })
  if (!user) return null
  return prisma.masterAdmin.findFirst({ where: { email: user.email, active: true } })
}

export async function GET(req: Request) {
  try {
    const master = await requireMaster(req)
    if (!master) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })

    const [avaliadores, consultorias] = await Promise.all([
      prisma.avaliador.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.consultoria.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ])
    const consultoriaMap = new Map(consultorias.map(consultoria => [consultoria.id, consultoria]))

    return NextResponse.json({
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
        created_at: avaliador.createdAt.toISOString(),
        consultoria_id: avaliador.consultoriaId,
        consultoria: avaliador.consultoriaId ? { name: consultoriaMap.get(avaliador.consultoriaId)?.name || '' } : null,
      })),
      consultorias: consultorias.map(consultoria => ({ id: consultoria.id, name: consultoria.name, plan: consultoria.plan })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar avaliadores' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const master = await requireMaster(req)
    if (!master) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })

    const body = await req.json()
    if (!body.full_name || !body.email || !body.consultoria_id || !body.password) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    const now = new Date()
    const existing = await prisma.authUser.findUnique({ where: { email: body.email } })
    if (existing) return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })

    const result = await prisma.$transaction(async tx => {
      const user = await tx.authUser.create({
        data: { email: body.email, passwordHash: hashPassword(body.password) },
      })
      const avaliador = await tx.avaliador.create({
        data: {
          id: user.id,
          consultoriaId: body.consultoria_id,
          fullName: body.full_name,
          email: body.email,
          role: body.role || 'avaliador',
          tipo_registro: body.tipo_registro || null,
          registro_mte: body.registro_mte || null,
          crea: body.crea || null,
          active: true,
          updated_at: now,
        },
      })
      return avaliador
    })

    return NextResponse.json({ avaliador: result })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao salvar avaliador' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const master = await requireMaster(req)
    if (!master) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })

    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    await prisma.avaliador.update({
      where: { id: body.id },
      data: {
        ...(body.full_name !== undefined && { fullName: body.full_name }),
        ...(body.consultoria_id !== undefined && { consultoriaId: body.consultoria_id }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.tipo_registro !== undefined && { tipo_registro: body.tipo_registro || null }),
        ...(body.registro_mte !== undefined && { registro_mte: body.registro_mte || null }),
        ...(body.crea !== undefined && { crea: body.crea || null }),
        ...(body.active !== undefined && { active: Boolean(body.active) }),
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao atualizar avaliador' }, { status: 500 })
  }
}
