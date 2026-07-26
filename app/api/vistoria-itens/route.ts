import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { itemDataFromPayload, itemJson, requireVistoriaWriteAccess } from '@/lib/vistoria-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const access = await requireVistoriaWriteAccess(req, body.vistoria_id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const item = await prisma.vistoriaItem.create({ data: itemDataFromPayload(body) })
    return NextResponse.json({ item: itemJson(item), id: item.id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao salvar item' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Item obrigatório' }, { status: 400 })
    const current = await prisma.vistoriaItem.findUnique({ where: { id: body.id } })
    if (!current) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    const access = await requireVistoriaWriteAccess(req, current.vistoriaId)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const item = await prisma.vistoriaItem.update({ where: { id: body.id }, data: itemDataFromPayload({ ...itemJson(current), ...body }) })
    return NextResponse.json({ item: itemJson(item) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar item' }, { status: 500 })
  }
}
