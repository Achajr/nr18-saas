import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'
import { gerarNumeroVistoriaPorObra } from '@/lib/vistoria-number'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const avaliador = await prisma.avaliador.findUnique({ where: { id: userId } })
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    if (avaliador.role === 'gestor') return NextResponse.json({ error: 'A consultoria não realiza avaliações' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const obraId = searchParams.get('obraId')

    if (obraId) {
      const obra = await prisma.obra.findFirst({
        where: { id: obraId, consultoriaId: avaliador.consultoriaId },
      })
      if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 })

      return NextResponse.json({
        avaliadorId: avaliador.id,
        consultoriaId: avaliador.consultoriaId,
        numero: await gerarNumeroVistoriaPorObra(obra.id),
        empresas: [],
      })
    }

    const empresas = await prisma.empresaCliente.findMany({
      where: { consultoriaId: avaliador.consultoriaId, active: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      avaliadorId: avaliador.id,
      consultoriaId: avaliador.consultoriaId,
      numero: '',
      empresas,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao preparar vistoria' }, { status: 500 })
  }
}
