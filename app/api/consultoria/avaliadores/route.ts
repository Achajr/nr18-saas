import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const current = await prisma.avaliador.findUnique({ where: { id: userId } })
    if (!current?.consultoriaId || current.role !== 'gestor') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const [consultoria, avaliadores, vistorias] = await Promise.all([
      prisma.consultoria.findUnique({ where: { id: current.consultoriaId } }),
      prisma.avaliador.findMany({ where: { consultoriaId: current.consultoriaId }, orderBy: { fullName: 'asc' } }),
      prisma.vistoria.findMany({
        where: { consultoriaId: current.consultoriaId },
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
