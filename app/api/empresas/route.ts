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
    const consultoriaId = searchParams.get('consultoriaId')
    const includeInactive = searchParams.get('all') === '1'

    const where: any = { consultoriaId: consultoriaId || avaliador.consultoriaId }
    if (!includeInactive) where.active = true

    const empresas = await prisma.empresaCliente.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ empresas })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar empresas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const avaliador = await getCurrentAvaliador(req)
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const consultoriaId = body.consultoriaId || body.consultoria_id || avaliador.consultoriaId
    const name = body.name || body.razaoSocial

    if (!consultoriaId || !name) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    if (consultoriaId !== avaliador.consultoriaId) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const now = new Date()

    const empresa = await prisma.empresaCliente.create({
      data: {
        consultoriaId,
        name,
        cnpj: body.cnpj || null,
        email: body.email || null,
        phone: body.phone || null,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        uf: body.uf || null,
        cep: body.cep || null,
        cnae: body.cnae || null,
        grau_risco: body.grau_risco || null,
        responsavel_nome: body.responsavel_nome || null,
        responsavel_cargo: body.responsavel_cargo || null,
        responsavel_email: body.responsavel_email || null,
        avaliador_responsavel: body.avaliador_responsavel || null,
        active: true,
        created_by: avaliador.id,
        updated_at: now,
      }
    })

    return NextResponse.json({ empresa })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao salvar empresa' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const avaliador = await getCurrentAvaliador(req)
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const empresa = await prisma.empresaCliente.updateMany({
      where: { id, consultoriaId: avaliador.consultoriaId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.cnpj !== undefined && { cnpj: body.cnpj || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.endereco !== undefined && { endereco: body.endereco || null }),
        ...(body.cidade !== undefined && { cidade: body.cidade || null }),
        ...(body.uf !== undefined && { uf: body.uf || null }),
        ...(body.cep !== undefined && { cep: body.cep || null }),
        ...(body.cnae !== undefined && { cnae: body.cnae || null }),
        ...(body.grau_risco !== undefined && { grau_risco: body.grau_risco || null }),
        ...(body.responsavel_nome !== undefined && { responsavel_nome: body.responsavel_nome || null }),
        ...(body.responsavel_cargo !== undefined && { responsavel_cargo: body.responsavel_cargo || null }),
        ...(body.responsavel_email !== undefined && { responsavel_email: body.responsavel_email || null }),
        ...(body.avaliador_responsavel !== undefined && { avaliador_responsavel: body.avaliador_responsavel || null }),
        ...(body.active !== undefined && { active: Boolean(body.active) }),
        updated_at: new Date(),
      },
    })

    if (!empresa.count) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao atualizar empresa' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const avaliador = await getCurrentAvaliador(req)
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    await prisma.empresaCliente.updateMany({
      where: { id, consultoriaId: avaliador.consultoriaId },
      data: { active: false, updated_at: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao remover empresa' }, { status: 500 })
  }
}
