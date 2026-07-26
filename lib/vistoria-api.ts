import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

export async function getAvaliadorFromRequest(req: Request) {
  const userId = getSessionUserIdFromRequest(req)
  if (!userId) return null
  return prisma.avaliador.findUnique({ where: { id: userId } })
}

export async function requireVistoriaAccess(req: Request, vistoriaId: string) {
  const avaliador = await getAvaliadorFromRequest(req)
  if (!avaliador?.consultoriaId) return { error: 'Não autenticado', status: 401 as const }
  const vistoria = await prisma.vistoria.findFirst({ where: { id: vistoriaId, consultoriaId: avaliador.consultoriaId } })
  if (!vistoria) return { error: 'Vistoria não encontrada', status: 404 as const }
  return { avaliador, vistoria }
}

export async function requireVistoriaWriteAccess(req: Request, vistoriaId: string) {
  const access = await requireVistoriaAccess(req, vistoriaId)
  if ('error' in access) return access
  if (access.avaliador.role === 'gestor') return { error: 'A consultoria possui acesso somente para visualização da vistoria', status: 403 as const }
  return access
}

export function vistoriaJson(v: any) {
  if (!v) return null
  return {
    ...v,
    obra_id: v.obraId,
    consultoria_id: v.consultoriaId,
    avaliador_id: v.avaliadorId,
    parecer_ia: v.parecerIa,
    parecer_editado: v.parecerEditado,
  }
}

export function obraJson(o: any, empresa?: any) {
  if (!o) return null
  return {
    ...o,
    empresa_cliente_id: o.empresaClienteId,
    consultoria_id: o.consultoriaId,
    empresa_cliente: empresa ? { ...empresa } : null,
  }
}

export function avaliadorJson(a: any, consultoria?: any) {
  if (!a) return null
  return {
    ...a,
    full_name: a.fullName,
    consultoria_id: a.consultoriaId,
    consultoria: consultoria ? { ...consultoria } : null,
  }
}

export function itemJson(i: any) {
  if (!i) return null
  return {
    ...i,
    vistoria_id: i.vistoriaId,
    item_id: i.itemId,
    bloco_id: i.blocoId,
    item_texto: i.itemTexto,
    item_ref: i.itemRef,
    item_nivel: i.itemNivel,
    item_multa: i.itemMulta,
  }
}

export function fotoJson(f: any) {
  if (!f) return null
  return { ...f, vistoria_id: f.vistoriaId, item_id: f.itemId, vistoria_item_id: f.vistoriaItemId, storage_path: f.storagePath }
}

export function vinculoJson(v: any) {
  if (!v) return null
  return { ...v, vistoria_id: v.vistoriaId, item_id: v.itemId }
}

export function empreiteiraJson(e: any) {
  if (!e) return null
  return { ...e, obra_id: e.obraId }
}

export function itemDataFromPayload(payload: any) {
  return {
    vistoriaId: payload.vistoria_id,
    itemId: payload.item_id,
    blocoId: payload.bloco_id,
    bloco_titulo: payload.bloco_titulo || null,
    itemTexto: payload.item_texto || null,
    itemRef: payload.item_ref || null,
    itemNivel: payload.item_nivel || null,
    item_perigo: payload.item_perigo || null,
    itemMulta: payload.item_multa || null,
    item_nr_texto: payload.item_nr_texto || null,
    item_etapa: payload.item_etapa || null,
    item_tipo_verificacao: payload.item_tipo_verificacao || null,
    item_evidencias: payload.item_evidencias || [],
    item_aplicabilidade: payload.item_aplicabilidade || null,
    item_criterio: payload.item_criterio || null,
    status: payload.status,
    observacao: payload.observacao || null,
    updated_at: new Date(),
  }
}

export async function buildVistoriaWithObra(vistoria: any) {
  const obra = await prisma.obra.findUnique({ where: { id: vistoria.obraId } })
  const empresa = obra?.empresaClienteId ? await prisma.empresaCliente.findUnique({ where: { id: obra.empresaClienteId } }) : null
  return { ...vistoriaJson(vistoria), obra: obraJson(obra, empresa) }
}
