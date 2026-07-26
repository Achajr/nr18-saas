import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { buildVistoriaWithObra, itemJson, requireVistoriaAccess } from '@/lib/vistoria-api'

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const access = await requireVistoriaAccess(req, id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const current = await buildVistoriaWithObra(access.vistoria)
    const all = await prisma.vistoria.findMany({
      where: { obraId: access.vistoria.obraId, status: { in: ['concluida', 'assinada'] }, data_vistoria: { lte: access.vistoria.data_vistoria } },
      orderBy: [{ data_vistoria: 'asc' }, { numero: 'asc' }],
    })
    const withCurrent = new Map<string, any>()
    for (const v of all) withCurrent.set(v.id, await buildVistoriaWithObra(v))
    withCurrent.set(access.vistoria.id, current)
    const inspections = Array.from(withCurrent.values()).sort((a, b) => {
      const dateOrder = a.data_vistoria.localeCompare(b.data_vistoria)
      return dateOrder !== 0 ? dateOrder : a.numero.localeCompare(b.numero)
    })
    const ids = inspections.map(v => v.id)
    const items = ids.length ? await prisma.vistoriaItem.findMany({ where: { vistoriaId: { in: ids } } }) : []
    return NextResponse.json({ current, inspections, items: items.map(itemJson) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao carregar comparativo' }, { status: 500 })
  }
}
