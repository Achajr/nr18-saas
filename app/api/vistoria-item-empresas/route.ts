import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireVistoriaAccess, vinculoJson } from '@/lib/vistoria-api'

async function accessByItem(req: Request, itemId: string) {
  const item = await prisma.vistoriaItem.findUnique({ where: { id: itemId } })
  if (!item) return { error: 'Item não encontrado', status: 404 as const }
  return requireVistoriaAccess(req, item.vistoriaId)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const access = await requireVistoriaAccess(req, body.vistoria_id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const vinculo = await prisma.vistoriaItemEmpresa.create({ data: { vistoriaId: body.vistoria_id, itemId: body.item_id, empresa_tipo: body.empresa_tipo, empreiteira_id: body.empreiteira_id || null } })
    return NextResponse.json({ vinculo: vinculoJson(vinculo) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao salvar vínculo' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const access = await accessByItem(req, body.item_id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    await prisma.vistoriaItemEmpresa.deleteMany({ where: { itemId: body.item_id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao remover vínculo' }, { status: 500 })
  }
}
