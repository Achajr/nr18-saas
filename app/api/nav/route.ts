import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const user = await prisma.authUser.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const master = await prisma.masterAdmin.findFirst({ where: { email: user.email, active: true } })
    if (master) {
      return NextResponse.json({
        perfil: 'master',
        user: { id: master.id, full_name: master.fullName, email: user.email, consultoria: { name: 'Master Admin' } },
        pendentes: 0,
      })
    }

    const avaliador = await prisma.avaliador.findUnique({ where: { id: user.id } })
    if (!avaliador) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const consultoria = avaliador.consultoriaId
      ? await prisma.consultoria.findUnique({ where: { id: avaliador.consultoriaId } })
      : null
    const pendentes = await prisma.vistoria.count({
      where: {
        ...(avaliador.role === 'gestor'
          ? { consultoriaId: avaliador.consultoriaId || '' }
          : { avaliadorId: avaliador.id }),
        status: { in: ['incompleta', 'em_andamento'] },
      },
    })

    return NextResponse.json({
      perfil: avaliador.role === 'gestor' ? 'gestor' : 'avaliador',
      user: {
        id: avaliador.id,
        full_name: avaliador.fullName,
        email: user.email,
        role: avaliador.role,
        consultoria_id: avaliador.consultoriaId,
        consultoria: consultoria ? { name: consultoria.name } : null,
      },
      pendentes,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar navegação' }, { status: 500 })
  }
}
