import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireVistoriaWriteAccess } from '@/lib/vistoria-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const access = await requireVistoriaWriteAccess(req, body.vistoria_id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const total = await prisma.vistoria.count({ where: { consultoriaId: access.vistoria.consultoriaId } })
    const numero = `${String(total + 1).padStart(3, '0')}/${new Date().getFullYear()}`
    const vistoria = await prisma.vistoria.create({ data: { obraId: access.vistoria.obraId, consultoriaId: access.vistoria.consultoriaId, avaliadorId: access.avaliador.id, numero, data_vistoria: new Date().toISOString().split('T')[0], clima: body.clima ?? access.vistoria.clima ?? 'Bom / ensolarado', etapa_obra: body.etapa_obra ?? access.vistoria.etapa_obra ?? '', observacoes_gerais: body.observacoes_gerais ?? `Reavaliação baseada na vistoria ${access.vistoria.numero}.`, status: 'em_andamento' } })
    return NextResponse.json({ id: vistoria.id, vistoria })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao criar reavaliação' }, { status: 500 })
  }
}
