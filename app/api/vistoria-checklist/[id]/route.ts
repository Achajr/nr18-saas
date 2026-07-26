import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { buildVistoriaWithObra, empreiteiraJson, fotoJson, itemJson, requireVistoriaAccess, vinculoJson, vistoriaJson } from '@/lib/vistoria-api'

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const access = await requireVistoriaAccess(req, id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const url = new URL(req.url)
    const baseId = url.searchParams.get('base')
    const vistoria = await buildVistoriaWithObra(access.vistoria)
    const [saved, empreiteiras, fotos] = await Promise.all([
      prisma.vistoriaItem.findMany({ where: { vistoriaId: id } }),
      prisma.obraEmpreiteira.findMany({ where: { obraId: access.vistoria.obraId, ativa: true }, orderBy: { createdAt: 'asc' } }),
      prisma.vistoriaFoto.findMany({ where: { vistoriaId: id } }),
    ])
    const vinculos = saved.length ? await prisma.vistoriaItemEmpresa.findMany({ where: { itemId: { in: saved.map(i => i.id) } } }) : []

    let base = null
    if (baseId && baseId !== id) {
      const baseAccess = await requireVistoriaAccess(req, baseId)
      if (!('error' in baseAccess)) {
        const baseItens = await prisma.vistoriaItem.findMany({ where: { vistoriaId: baseId } })
        const baseVinculos = baseItens.length ? await prisma.vistoriaItemEmpresa.findMany({ where: { itemId: { in: baseItens.map(i => i.id) } } }) : []
        base = { vistoria: vistoriaJson(baseAccess.vistoria), itens: baseItens.map(itemJson), vinculos: baseVinculos.map(vinculoJson) }
      }
    }

    return NextResponse.json({
      user: { id: access.avaliador.id },
      avaliador: { id: access.avaliador.id, consultoria_id: access.avaliador.consultoriaId, role: access.avaliador.role },
      vistoria,
      saved: saved.map(itemJson),
      vinculos: vinculos.map(vinculoJson),
      fotos: fotos.map(fotoJson),
      empreiteiras: empreiteiras.map(empreiteiraJson),
      base,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao carregar checklist' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const access = await requireVistoriaAccess(req, id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await req.json()
    const data: any = {}
    const patch = body.data || body
    ;['status', 'total_itens', 'total_conformes', 'total_nao_conformes', 'total_na', 'indice_conformidade', 'classificacao'].forEach(key => {
      if (patch[key] !== undefined) data[key] = patch[key]
    })
    if (patch.parecer_ia !== undefined) data.parecerIa = patch.parecer_ia
    if (patch.parecer_editado !== undefined) data.parecerEditado = patch.parecer_editado
    const vistoria = await prisma.vistoria.update({ where: { id }, data })
    return NextResponse.json({ vistoria: vistoriaJson(vistoria) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar vistoria' }, { status: 500 })
  }
}
