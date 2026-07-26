import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const avaliador = await prisma.avaliador.findUnique({ where: { id: userId } })
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const empresas = await prisma.empresaCliente.findMany({
      where: { consultoriaId: avaliador.consultoriaId },
      orderBy: { name: 'asc' },
    })
    const obras = await prisma.obra.findMany({
      where: { consultoriaId: avaliador.consultoriaId },
      select: { id: true, status: true, empresaClienteId: true },
    })

    return NextResponse.json({
      empresas: empresas.map(empresa => ({
        ...empresa,
        obras: obras
          .filter(obra => obra.empresaClienteId === empresa.id)
          .map(({ id, status }) => ({ id, status })),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar empresas' }, { status: 500 })
  }
}
