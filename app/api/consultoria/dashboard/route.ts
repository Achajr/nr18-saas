import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

function monthStart() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

function monthRange(indexFromNow: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - indexFromNow)
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return {
    label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const avaliador = await prisma.avaliador.findUnique({ where: { id: userId } })
    if (!avaliador || avaliador.role !== 'gestor' || !avaliador.consultoriaId) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const cid = avaliador.consultoriaId
    const inicioMes = monthStart()

    const [
      consultoria,
      totalAv,
      totalEmp,
      totalObras,
      totalVist,
      vstMes,
      vstConcluidas,
      vstIncompletas,
      vstAndamento,
      concluidas,
      ultimas,
      incompletas,
      avaliadores,
    ] = await Promise.all([
      prisma.consultoria.findUnique({ where: { id: cid } }),
      prisma.avaliador.count({ where: { consultoriaId: cid, active: true } }),
      prisma.empresaCliente.count({ where: { consultoriaId: cid, active: true } }),
      prisma.obra.count({ where: { consultoriaId: cid, status: 'ativa' } }),
      prisma.vistoria.count({ where: { consultoriaId: cid } }),
      prisma.vistoria.count({ where: { consultoriaId: cid, createdAt: { gte: inicioMes } } }),
      prisma.vistoria.count({ where: { consultoriaId: cid, status: 'concluida' } }),
      prisma.vistoria.count({ where: { consultoriaId: cid, status: 'incompleta' } }),
      prisma.vistoria.count({ where: { consultoriaId: cid, status: 'em_andamento' } }),
      prisma.vistoria.findMany({ where: { consultoriaId: cid, status: 'concluida' } }),
      prisma.vistoria.findMany({ where: { consultoriaId: cid }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.vistoria.findMany({ where: { consultoriaId: cid, status: { in: ['incompleta', 'em_andamento'] } }, orderBy: { createdAt: 'desc' } }),
      prisma.avaliador.findMany({ where: { consultoriaId: cid, active: true }, orderBy: { fullName: 'asc' } }),
    ])

    const allForCards = [...ultimas, ...incompletas, ...concluidas]
    const obraIds = Array.from(new Set(allForCards.map(v => v.obraId)))
    const obras = await prisma.obra.findMany({ where: { id: { in: obraIds } } })
    const empresas = await prisma.empresaCliente.findMany({
      where: { id: { in: obras.map(o => o.empresaClienteId).filter((id): id is string => !!id) } },
    })
    const obraMap = new Map(obras.map(o => [o.id, o]))
    const empresaMap = new Map(empresas.map(e => [e.id, e]))
    const avaliadorMap = new Map(avaliadores.map(av => [av.id, av]))

    const formatVistoria = (vistoria: (typeof allForCards)[number]) => {
      const obra = obraMap.get(vistoria.obraId)
      const empresa = obra?.empresaClienteId ? empresaMap.get(obra.empresaClienteId) : null
      const av = avaliadorMap.get(vistoria.avaliadorId)
      return {
        id: vistoria.id,
        numero: vistoria.numero,
        data_vistoria: vistoria.data_vistoria,
        status: vistoria.status,
        indice_conformidade: vistoria.indice_conformidade,
        classificacao: vistoria.classificacao,
        obra: obra ? { name: obra.name, empresa_cliente: empresa ? { id: empresa.id, name: empresa.name } : null } : null,
        avaliador: av ? { full_name: av.fullName } : null,
      }
    }

    const indiceMedio = concluidas.length
      ? Math.round(concluidas.reduce((sum, vistoria) => sum + vistoria.indice_conformidade, 0) / concluidas.length * 100) / 100
      : 0
    const totalNcs = concluidas.reduce((sum, vistoria) => sum + vistoria.total_nao_conformes, 0)

    const rankingMap = new Map<string, { id: string; name: string; total_ncs: number; total_vistorias: number; indice_sum: number }>()
    concluidas.forEach(vistoria => {
      const obra = obraMap.get(vistoria.obraId)
      const empresa = obra?.empresaClienteId ? empresaMap.get(obra.empresaClienteId) : null
      if (!empresa) return
      const current = rankingMap.get(empresa.id) || { id: empresa.id, name: empresa.name, total_ncs: 0, total_vistorias: 0, indice_sum: 0 }
      current.total_ncs += vistoria.total_nao_conformes
      current.total_vistorias += 1
      current.indice_sum += vistoria.indice_conformidade
      rankingMap.set(empresa.id, current)
    })

    const avaliadorStats = avaliadores.map(av => {
      const vistorias = concluidas.filter(v => v.avaliadorId === av.id)
      const vistoriasMes = vistorias.filter(v => v.createdAt >= inicioMes).length
      const indice = vistorias.length
        ? Math.round(vistorias.reduce((sum, v) => sum + v.indice_conformidade, 0) / vistorias.length * 100) / 100
        : 0
      return { id: av.id, full_name: av.fullName, total_vistorias: vistorias.length, vistorias_mes: vistoriasMes, indice_medio: indice }
    }).sort((a, b) => b.total_vistorias - a.total_vistorias)

    const evolucaoMensal = Array.from({ length: 6 }, (_, index) => monthRange(5 - index)).map(month => {
      const rows = concluidas.filter(v => v.data_vistoria >= month.start && v.data_vistoria <= month.end)
      return {
        mes: month.label,
        total: rows.length,
        indice_medio: rows.length ? Math.round(rows.reduce((sum, v) => sum + v.indice_conformidade, 0) / rows.length * 100) / 100 : 0,
      }
    })

    return NextResponse.json({
      consultoria,
      avaliador: { ...avaliador, consultoria },
      stats: {
        total_avaliadores: totalAv,
        total_empresas: totalEmp,
        total_obras: totalObras,
        total_vistorias: totalVist,
        vistorias_mes: vstMes,
        vistorias_concluidas: vstConcluidas,
        vistorias_incompletas: vstIncompletas,
        vistorias_andamento: vstAndamento,
        indice_medio: indiceMedio,
        total_ncs: totalNcs,
      },
      ultimasVistorias: ultimas.map(formatVistoria),
      incompletas: incompletas.map(formatVistoria),
      rankingEmpresas: Array.from(rankingMap.values())
        .map(row => ({ ...row, indice_medio: Math.round(row.indice_sum / row.total_vistorias * 100) / 100 }))
        .sort((a, b) => b.total_ncs - a.total_ncs)
        .slice(0, 6),
      avaliadorStats,
      evolucaoMensal,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar painel da consultoria' }, { status: 500 })
  }
}
