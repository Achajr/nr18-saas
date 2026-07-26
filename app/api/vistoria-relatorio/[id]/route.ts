import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { avaliadorJson, buildVistoriaWithObra, empreiteiraJson, fotoJson, itemJson, requireVistoriaAccess, vinculoJson, vistoriaJson } from '@/lib/vistoria-api'

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const access = await requireVistoriaAccess(req, id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const [vistoriaBase, avaliador, consultoria] = await Promise.all([
      buildVistoriaWithObra(access.vistoria),
      prisma.avaliador.findUnique({ where: { id: access.vistoria.avaliadorId } }),
      prisma.consultoria.findUnique({ where: { id: access.vistoria.consultoriaId } }),
    ])
    const vistoria = { ...vistoriaBase, avaliador: avaliadorJson(avaliador, consultoria) }
    const obraId = access.vistoria.obraId
    const [empreiteiras, itens, vinculos, fotos] = await Promise.all([
      prisma.obraEmpreiteira.findMany({ where: { obraId, ativa: true }, orderBy: { createdAt: 'asc' } }),
      prisma.vistoriaItem.findMany({ where: { vistoriaId: id } }),
      prisma.vistoriaItemEmpresa.findMany({ where: { vistoriaId: id } }),
      prisma.vistoriaFoto.findMany({ where: { vistoriaId: id } }),
    ])
    return NextResponse.json({ vistoria, empreiteiras: empreiteiras.map(empreiteiraJson), itens: itens.map(itemJson), vinculos: vinculos.map(vinculoJson), fotos: fotos.map(fotoJson) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao carregar relatório' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const access = await requireVistoriaAccess(req, id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await req.json()
    const data: any = {}
    if (body.parecer_ia !== undefined) data.parecerIa = body.parecer_ia
    if (body.parecer_editado !== undefined) data.parecerEditado = body.parecer_editado
    const vistoria = await prisma.vistoria.update({ where: { id }, data })
    return NextResponse.json({ vistoria: vistoriaJson(vistoria) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao salvar parecer' }, { status: 500 })
  }
}
