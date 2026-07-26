import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { fotoJson, requireVistoriaWriteAccess } from '@/lib/vistoria-api'

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const vistoriaId = String(form.get('vistoria_id') || '')
    const itemId = String(form.get('item_id') || '') || null
    const vistoriaItemId = String(form.get('vistoria_item_id') || '') || null
    if (!(file instanceof File) || !vistoriaId) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    const access = await requireVistoriaWriteAccess(req, vistoriaId)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

    const ext = safeSegment((file.name.split('.').pop() || 'jpg').slice(0, 12))
    const dir = path.join(process.cwd(), 'public', 'uploads', 'vistorias', safeSegment(vistoriaId), safeSegment(itemId || 'geral'))
    await mkdir(dir, { recursive: true })
    const filename = `${Date.now()}-${randomUUID()}.${ext}`
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))
    const storagePath = `/uploads/vistorias/${safeSegment(vistoriaId)}/${safeSegment(itemId || 'geral')}/${filename}`

    const foto = await prisma.vistoriaFoto.create({ data: { vistoriaId, organization_id: String(form.get('organization_id') || '') || null, itemId, vistoriaItemId, storagePath, filename: file.name, mime_type: file.type || null, tipo: String(form.get('tipo') || 'nc') } })
    return NextResponse.json({ foto: fotoJson(foto), id: foto.id, storage_path: storagePath, url: storagePath })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao enviar foto' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })
    const foto = await prisma.vistoriaFoto.findUnique({ where: { id: body.id } })
    if (!foto) return NextResponse.json({ ok: true })
    const access = await requireVistoriaWriteAccess(req, foto.vistoriaId)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    await prisma.vistoriaFoto.delete({ where: { id: foto.id } })
    if (foto.storagePath.startsWith('/uploads/vistorias/')) {
      await unlink(path.join(process.cwd(), 'public', foto.storagePath)).catch(() => undefined)
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao remover foto' }, { status: 500 })
  }
}
