import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let userIdCookie = searchParams.get('userId')

    if (!userIdCookie) {
      const cookieHeader = req.headers.get('cookie') || ''
      userIdCookie = cookieHeader.split('; ').find(row => row.startsWith('auth_user_id='))?.split('=')[1] || null
    }

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.authUser.findUnique({
      where: { id: userIdCookie }
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
      cnpj: null,
      plan: 'pro',
      active: c.active,
      max_avaliadores: 10,
      max_empresas: 50,
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
