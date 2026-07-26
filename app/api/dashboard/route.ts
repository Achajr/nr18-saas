import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const avaliador = await prisma.avaliador.findUnique({
      where: { id: userId },
    })

    if (!avaliador) {
      return NextResponse.json({ error: 'Avaliador não encontrado' }, { status: 404 })
    }

    const cid = avaliador.consultoriaId

    if (!cid) {
      return NextResponse.json({ error: 'Avaliador sem consultoria vinculada' }, { status: 403 })
    }

    const consultoria = await prisma.consultoria.findUnique({ where: { id: cid } })

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
    })

    const obraIds = Array.from(new Set(ultimasVistorias.map(v => v.obraId)))
    const obras = await prisma.obra.findMany({ where: { id: { in: obraIds } } })
    const empresas = await prisma.empresaCliente.findMany({
      where: { id: { in: obras.map(o => o.empresaClienteId).filter((id): id is string => !!id) } },
    })
    const obraMap = new Map(obras.map(obra => [obra.id, obra]))
    const empresaMap = new Map(empresas.map(empresa => [empresa.id, empresa]))

    const formattedVistorias = ultimasVistorias.map(v => ({
      id: v.id,
      numero: v.numero,
      data_vistoria: v.data_vistoria || v.createdAt.toISOString(),
      status: v.status,
      indice_conformidade: v.indice_conformidade,
      classificacao: v.classificacao,
      obra: {
        name: obraMap.get(v.obraId)?.name || 'Obra',
        empresa_cliente: { name: empresaMap.get(obraMap.get(v.obraId)?.empresaClienteId || '')?.name || 'Empresa' }
      }
    }))

    return NextResponse.json({
      avaliador: {
        id: avaliador.id,
        full_name: avaliador.fullName,
        role: avaliador.role,
        registro_mte: avaliador.registro_mte,
        crea: avaliador.crea,
        consultoria_id: avaliador.consultoriaId,
        consultoria: { name: consultoria?.name || '', logoUrl: consultoria?.logoUrl || null }
      },
      stats: {
        total_empresas: totalEmpresas,
        total_vistorias: totalVistorias,
        vistorias_mes: vistoriasMes,
        ncs_abertas: 0
      },
      vistorias: formattedVistorias
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar dashboard' }, { status: 500 })
  }
}
