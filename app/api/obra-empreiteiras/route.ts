import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { empreiteiraJson, getAvaliadorFromRequest } from '@/lib/vistoria-api'

export async function GET(req: Request) {
  try {
    const avaliador = await getAvaliadorFromRequest(req)
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const obraId = new URL(req.url).searchParams.get('obraId') || ''
    const obra = await prisma.obra.findFirst({ where: { id: obraId, consultoriaId: avaliador.consultoriaId } })
    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 })
    const empreiteiras = await prisma.obraEmpreiteira.findMany({ where: { obraId, ativa: true }, orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ empreiteiras: empreiteiras.map(empreiteiraJson) })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar empreiteiras' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const avaliador = await getAvaliadorFromRequest(req)
    if (!avaliador?.consultoriaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const body = await req.json()
    const obra = await prisma.obra.findFirst({ where: { id: body.obra_id, consultoriaId: avaliador.consultoriaId } })
    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 })
    const empreiteira = await prisma.obraEmpreiteira.create({ data: { obraId: obra.id, consultoria_id: avaliador.consultoriaId, name: body.name, cnpj: body.cnpj || null, num_funcionarios: Number(body.num_funcionarios) || 0, ativa: true, updated_at: new Date() } })
    return NextResponse.json({ empreiteira: empreiteiraJson(empreiteira) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao adicionar empreiteira' }, { status: 500 })
  }
}
