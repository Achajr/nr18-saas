import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

async function getCurrentAvaliador(req: Request) {
  const userId = getSessionUserIdFromRequest(req)
  if (!userId) return null
  return prisma.avaliador.findUnique({ where: { id: userId } })
}

export async function GET(req: Request) {
  try {
    const avaliador = await getCurrentAvaliador(req)
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get('empresaId')
    if (!empresaId) return NextResponse.json({ error: 'Empresa é obrigatória' }, { status: 400 })

    const obras = await prisma.obra.findMany({
      where: {
        consultoriaId: avaliador.consultoriaId,
        empresaClienteId: empresaId,
        status: { not: 'cancelada' },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ obras })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar obras' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const avaliador = await getCurrentAvaliador(req)
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    if (!body.name || !body.empresa_cliente_id) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    const empresa = await prisma.empresaCliente.findFirst({
      where: { id: body.empresa_cliente_id, consultoriaId: avaliador.consultoriaId },
    })
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const obra = await prisma.obra.create({
      data: {
        name: body.name,
        consultoriaId: avaliador.consultoriaId,
        empresaClienteId: empresa.id,
        avaliador_id: avaliador.id,
        etapa: body.etapa || null,
        status: 'ativa',
        empresa_nome: empresa.name,
        empresa_cnpj: empresa.cnpj,
        num_funcionarios: Number(body.num_funcionarios) || 0,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ obra })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao criar obra' }, { status: 500 })
  }
}
