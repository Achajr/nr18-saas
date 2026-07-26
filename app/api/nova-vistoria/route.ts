import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const avaliador = await prisma.avaliador.findUnique({ where: { id: userId } })
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const [totalVistorias, empresas] = await Promise.all([
      prisma.vistoria.count({ where: { consultoriaId: avaliador.consultoriaId } }),
      prisma.empresaCliente.findMany({
        where: { consultoriaId: avaliador.consultoriaId, active: true },
        orderBy: { name: 'asc' },
      }),
    ])

    const numero = `${String(totalVistorias + 1).padStart(3, '0')}/${new Date().getFullYear()}`

    return NextResponse.json({
      avaliadorId: avaliador.id,
      consultoriaId: avaliador.consultoriaId,
      numero,
      empresas,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao preparar vistoria' }, { status: 500 })
  }
}
