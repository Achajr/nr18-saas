import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function GET(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope') || 'mine'
    const avaliador = await prisma.avaliador.findUnique({ where: { id: userId } })
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    if (scope === 'consultoria' && avaliador.role !== 'gestor') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const where = scope === 'consultoria'
      ? { consultoriaId: avaliador.consultoriaId }
      : { avaliadorId: avaliador.id }

    const vistorias = await prisma.vistoria.findMany({ where, orderBy: { createdAt: 'desc' } })
    const [obras, avaliadores] = await Promise.all([
      prisma.obra.findMany({ where: { id: { in: Array.from(new Set(vistorias.map(v => v.obraId))) } } }),
      prisma.avaliador.findMany({ where: { id: { in: Array.from(new Set(vistorias.map(v => v.avaliadorId))) } } }),
    ])
    const empresas = await prisma.empresaCliente.findMany({
      where: { id: { in: obras.map(obra => obra.empresaClienteId).filter((id): id is string => !!id) } },
    })

    const obraMap = new Map(obras.map(obra => [obra.id, obra]))
    const empresaMap = new Map(empresas.map(empresa => [empresa.id, empresa]))
    const avaliadorMap = new Map(avaliadores.map(av => [av.id, av]))

    return NextResponse.json({
      consultoriaName: scope === 'consultoria'
        ? (await prisma.consultoria.findUnique({ where: { id: avaliador.consultoriaId } }))?.name || ''
        : '',
      vistorias: vistorias.map(vistoria => {
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
          total_nao_conformes: vistoria.total_nao_conformes,
          obra: obra ? { name: obra.name, empresa_cliente: empresa ? { name: empresa.name } : null } : null,
          avaliador: av ? { full_name: av.fullName } : null,
        }
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar vistorias' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = getSessionUserIdFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const avaliador = await prisma.avaliador.findUnique({ where: { id: userId } })
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    if (avaliador.role === 'gestor') return NextResponse.json({ error: 'A consultoria não realiza avaliações' }, { status: 403 })

    const body = await req.json()
    if (!body.obra_id || !body.numero || !body.data_vistoria) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    const obra = await prisma.obra.findFirst({
      where: { id: body.obra_id, consultoriaId: avaliador.consultoriaId },
    })
    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 })

    const vistoria = await prisma.vistoria.create({
      data: {
        obraId: obra.id,
        consultoriaId: avaliador.consultoriaId,
        avaliadorId: avaliador.id,
        numero: body.numero,
        data_vistoria: body.data_vistoria,
        clima: body.clima || null,
        etapa_obra: body.etapa_obra || obra.etapa || null,
        observacoes_gerais: body.observacoes_gerais || null,
        status: 'em_andamento',
      },
    })

    return NextResponse.json({ vistoria })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao criar vistoria' }, { status: 500 })
  }
}
