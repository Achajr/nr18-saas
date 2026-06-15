import { CHECKLIST, type ChecklistBloco, type ChecklistItem, type GrauMulta, type NivelRisco } from './checklist-data'

const STORAGE_PREFIX = 'nr18-checklist-modelo-v1'
const NIVEIS: NivelRisco[] = ['grave', 'alto', 'medio', 'baixo']
const MULTAS: GrauMulta[] = ['i1', 'i2', 'i3', 'i4']

function storageKey(consultoriaId?: string | null) {
  return `${STORAGE_PREFIX}:${consultoriaId || 'local'}`
}

export function cloneChecklist(): ChecklistBloco[] {
  return CHECKLIST.map(bloco => ({
    ...bloco,
    itens: bloco.itens.map(item => ({ ...item })),
  }))
}

export function normalizeChecklist(value: unknown): ChecklistBloco[] {
  if (!Array.isArray(value)) return cloneChecklist()

  const blocos = value
    .map((rawBloco: any, blocoIndex: number) => {
      const blocoId = String(rawBloco?.id || `bloco-${blocoIndex + 1}`).trim()
      const itensRaw = Array.isArray(rawBloco?.itens) ? rawBloco.itens : []
      const itens: ChecklistItem[] = itensRaw
        .map((rawItem: any, itemIndex: number) => {
          const nivel = NIVEIS.includes(rawItem?.nivel) ? rawItem.nivel : 'medio'
          const multa = MULTAS.includes(rawItem?.multa) ? rawItem.multa : 'i2'
          return {
            id: String(rawItem?.id || `${blocoId}-${itemIndex + 1}`).trim(),
            t: String(rawItem?.t || '').trim(),
            ref: String(rawItem?.ref || '').trim(),
            nivel,
            perigo: String(rawItem?.perigo || 'Geral').trim(),
            multa,
            nr: String(rawItem?.nr || '').trim(),
          }
        })
        .filter((item: ChecklistItem) => item.id && item.t)

      return {
        id: blocoId,
        titulo: String(rawBloco?.titulo || `Setor ${blocoIndex + 1}`).trim(),
        ref: String(rawBloco?.ref || '').trim(),
        itens,
      }
    })
    .filter((bloco: ChecklistBloco) => bloco.id && bloco.titulo && bloco.itens.length > 0)

  return blocos.length ? blocos : cloneChecklist()
}

export function loadLocalChecklist(consultoriaId?: string | null): ChecklistBloco[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(consultoriaId))
    return raw ? normalizeChecklist(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveLocalChecklist(blocos: ChecklistBloco[], consultoriaId?: string | null) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(consultoriaId), JSON.stringify(normalizeChecklist(blocos)))
}

export async function loadChecklistModelo(supabase: any, consultoriaId?: string | null): Promise<ChecklistBloco[]> {
  if (consultoriaId) {
    try {
      const { data, error } = await supabase
        .from('checklist_modelos')
        .select('blocos')
        .eq('consultoria_id', consultoriaId)
        .eq('ativo', true)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (!error && data?.[0]?.blocos) {
        const normalized = normalizeChecklist(data[0].blocos)
        saveLocalChecklist(normalized, consultoriaId)
        return normalized
      }
    } catch {
      // Tabela opcional: quando ela ainda nao existe, usamos o modelo local/padrao.
    }
  }

  return loadLocalChecklist(consultoriaId) || cloneChecklist()
}

export async function saveChecklistModelo(
  supabase: any,
  consultoriaId: string | null | undefined,
  blocos: ChecklistBloco[],
) {
  const normalized = normalizeChecklist(blocos)
  saveLocalChecklist(normalized, consultoriaId)

  if (!consultoriaId) return { ok: true, localOnly: true }

  try {
    const { data: existing } = await supabase
      .from('checklist_modelos')
      .select('id')
      .eq('consultoria_id', consultoriaId)
      .eq('ativo', true)
      .limit(1)

    if (existing?.[0]?.id) {
      const { error } = await supabase
        .from('checklist_modelos')
        .update({ blocos: normalized, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
      if (error) throw error
      return { ok: true, localOnly: false }
    }

    const { error } = await supabase
      .from('checklist_modelos')
      .insert({
        consultoria_id: consultoriaId,
        nome: 'Checklist NR-18 personalizado',
        ativo: true,
        blocos: normalized,
      })
    if (error) throw error
    return { ok: true, localOnly: false }
  } catch (err: any) {
    return { ok: false, localOnly: true, error: err?.message || 'Tabela checklist_modelos indisponivel' }
  }
}

export function findChecklistItem(blocos: ChecklistBloco[], itemId: string) {
  return blocos.flatMap(bloco => bloco.itens).find(item => item.id === itemId)
}

export function findChecklistBloco(blocos: ChecklistBloco[], blocoId: string) {
  return blocos.find(bloco => bloco.id === blocoId)
}
