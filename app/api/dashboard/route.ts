import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const userIdCookie = cookieHeader.split('; ').find(row => row.startsWith('auth_user_id='))?.split('=')[1]

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const avaliador = await prisma.avaliador.findUnique({
      where: { id: userIdCookie },
      include: { consultoria: true }
    })

    if (!avaliador) {
      return NextResponse.json({ error: 'Avaliador não encontrado' }, { status: 404 })
    }

    const cid = avaliador.consultoriaId

    const totalEmpresas = await prisma.empresaCliente.count({
      where: { consultoriaId: cid, active: true }
    })

    const totalVistorias = await prisma.vistoria.count({
      where: { avaliadorId: avaliador.id }
    })

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const vistoriasMes = await prisma.vistoria.count({
      where: {
        avaliadorId: avaliador.id,
        createdAt: { gte: inicioMes }
      }
    })

    const ultimasVistorias = await prisma.vistoria.findMany({
      where: { avaliadorId: avaliador.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        obra: {
          include: { empresaCliente: true }
        }
      }
    })

    const formattedVistorias = ultimasVistorias.map(v => ({
      id: v.id,
      numero: v.numero.toString(),
      data_vistoria: v.createdAt.toISOString(),
      status: v.status,
      indice_conformidade: 0,
      classificacao: null,
      obra: {
        name: v.obra.nome,
        empresa_cliente: { name: v.obra.empresaCliente.razaoSocial }
      }
    }))

    return NextResponse.json({
      avaliador: {
        id: avaliador.id,
        full_name: avaliador.fullName,
        role: avaliador.role,
        registro_mte: null,
        crea: null,
        consultoria_id: avaliador.consultoriaId,
        consultoria: { name: avaliador.consultoria.name }
      },
      stats: {
        total_empresas: totalEmpresas,
        total_vistorias: totalVistorias,
        vistorias_mes: vistoriasMes,
        ncs_abertas: 0
      },
      vistorias: formattedVistorias
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
