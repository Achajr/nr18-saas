import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.authUser.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const master = await prisma.masterAdmin.findUnique({
      where: { email: user.email }
    })

    if (!master) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const consultorias = await prisma.consultoria.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const totalAval = await prisma.avaliador.count()
    const totalObras = await prisma.obra.count()
    const totalVist = await prisma.vistoria.count()

    const formattedConsultorias = consultorias.map(c => ({
      id: c.id,
      name: c.name,
      cnpj: c.cnpj,
      email: c.email,
      phone: c.phone,
      responsavel_nome: c.responsavel_nome,
      responsavel_email: c.responsavel_email,
      plan: c.plan,
      active: c.active,
      max_avaliadores: c.max_avaliadores,
      max_empresas: c.max_empresas,
      max_obras: c.max_obras,
      logo_url: c.logoUrl,
      created_at: c.createdAt.toISOString()
    }))

    return NextResponse.json({
      masterName: master.fullName || user.email.split('@')[0],
      stats: {
        total_consultorias: consultorias.length,
        consultorias_ativas: consultorias.filter(c => c.active).length,
        total_avaliadores: totalAval,
        total_obras: totalObras,
        total_vistorias: totalVist,
      },
      consultorias: formattedConsultorias
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar painel master' }, { status: 500 })
  }
}
