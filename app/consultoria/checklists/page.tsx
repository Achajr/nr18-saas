'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cloneChecklist, loadChecklistModelo, saveChecklistModelo } from '@/lib/checklist-runtime'
import type { ChecklistBloco, GrauMulta, NivelRisco } from '@/lib/checklist-data'

const niveis: { value: NivelRisco; label: string }[] = [
  { value: 'grave', label: 'Grave' },
  { value: 'alto', label: 'Alto' },
  { value: 'medio', label: 'Médio' },
  { value: 'baixo', label: 'Baixo' },
]

const multas: { value: GrauMulta; label: string }[] = [
  { value: 'i1', label: 'I1' },
  { value: 'i2', label: 'I2' },
  { value: 'i3', label: 'I3' },
  { value: 'i4', label: 'I4' },
]

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42)
}

export default function ChecklistsPage() {
  const router = useRouter()
  const [consultoriaId, setConsultoriaId] = useState('')
  const [blocos, setBlocos] = useState<ChecklistBloco[]>([])
  const [blocoAtivo, setBlocoAtivo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: av } = await supabase
        .from('avaliadores')
        .select('consultoria_id, role')
        .eq('id', user.id)
        .single()

      if (!av) { router.push('/auth/login'); return }
      if (av.role !== 'gestor') { router.push('/dashboard'); return }

      setConsultoriaId(av.consultoria_id)
      const modelo = await loadChecklistModelo(supabase, av.consultoria_id)
      setBlocos(modelo)
      setBlocoAtivo(modelo[0]?.id || '')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar checklist')
    } finally {
      setLoading(false)
    }
  }

  const blocoSelecionado = blocos.find(bloco => bloco.id === blocoAtivo)
  const totalItens = blocos.reduce((sum, bloco) => sum + bloco.itens.length, 0)
  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase()
    if (!termo) return blocos
    return blocos
      .map(bloco => ({
        ...bloco,
        itens: bloco.itens.filter(item =>
          item.t.toLowerCase().includes(termo) ||
          item.ref.toLowerCase().includes(termo) ||
          item.perigo.toLowerCase().includes(termo)
        ),
      }))
      .filter(bloco => bloco.titulo.toLowerCase().includes(termo) || bloco.itens.length > 0)
  }, [blocos, search])

  function updateBloco(blocoId: string, patch: Partial<ChecklistBloco>) {
    setBlocos(prev => prev.map(bloco => bloco.id === blocoId ? { ...bloco, ...patch } : bloco))
  }

  function updateItem(blocoId: string, itemId: string, patch: any) {
    setBlocos(prev => prev.map(bloco => {
      if (bloco.id !== blocoId) return bloco
      return {
        ...bloco,
        itens: bloco.itens.map(item => item.id === itemId ? { ...item, ...patch } : item),
      }
    }))
  }

  function adicionarBloco() {
    const id = `setor-${Date.now()}`
    const novo: ChecklistBloco = {
      id,
      titulo: 'Novo setor do checklist',
      ref: 'NR 18',
      itens: [
        {
          id: `${id}-item-1`,
          t: 'Descreva o item a ser avaliado',
          ref: 'NR 18',
          nivel: 'medio',
          perigo: 'Geral',
          multa: 'i2',
          nr: 'Informe o texto legal ou critério técnico aplicado.',
        },
      ],
    }
    setBlocos(prev => [...prev, novo])
    setBlocoAtivo(id)
  }

  function adicionarItem(blocoId: string) {
    const bloco = blocos.find(b => b.id === blocoId)
    if (!bloco) return
    const base = slug(bloco.ref || bloco.titulo || 'item') || 'item'
    const novoId = `${base}-${Date.now()}`
    setBlocos(prev => prev.map(b => b.id === blocoId ? {
      ...b,
      itens: [
        ...b.itens,
        {
          id: novoId,
          t: 'Novo item de avaliação',
          ref: b.ref || 'NR 18',
          nivel: 'medio',
          perigo: 'Geral',
          multa: 'i2',
          nr: 'Informe o texto legal ou critério técnico aplicado.',
        },
      ],
    } : b))
  }

  function duplicarItem(blocoId: string, itemId: string) {
    const bloco = blocos.find(b => b.id === blocoId)
    const item = bloco?.itens.find(i => i.id === itemId)
    if (!bloco || !item) return
    setBlocos(prev => prev.map(b => b.id === blocoId ? {
      ...b,
      itens: [...b.itens, { ...item, id: `${item.id}-copia-${Date.now()}`, t: `${item.t} (cópia)` }],
    } : b))
  }

  function removerItem(blocoId: string, itemId: string) {
    setBlocos(prev => prev.map(bloco => {
      if (bloco.id !== blocoId || bloco.itens.length <= 1) return bloco
      return { ...bloco, itens: bloco.itens.filter(item => item.id !== itemId) }
    }))
  }

  async function salvar() {
    setSaving(true)
    try {
      const result = await saveChecklistModelo(supabase, consultoriaId, blocos)
      if (result.ok && !result.localOnly) {
        toast.success('Checklist salvo para a consultoria')
      } else if (result.ok) {
        toast.success('Checklist salvo localmente')
      } else {
        toast.success('Checklist salvo localmente')
        toast.error('Para compartilhar com a equipe, aplique a migração do Supabase')
      }
    } finally {
      setSaving(false)
    }
  }

  async function restaurarPadrao() {
    const padrao = cloneChecklist()
    setBlocos(padrao)
    setBlocoAtivo(padrao[0]?.id || '')
    toast.success('Modelo padrão restaurado na tela. Clique em salvar para aplicar.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 size={30} className="animate-spin text-[var(--brand)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-surface)]/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <button onClick={() => router.push('/consultoria')} className="rounded-2xl p-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]" aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-[var(--text-primary)]">Checklists prontos</h1>
            <p className="text-sm text-[var(--text-muted)]">{blocos.length} setores e {totalItens} itens configurados</p>
          </div>
          <button onClick={restaurarPadrao} className="hidden items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--brand)]/50 hover:text-[var(--brand)] sm:inline-flex">
            <RotateCcw size={16} />
            Restaurar
          </button>
          <button onClick={salvar} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--brand-muted)] transition hover:bg-[var(--brand-hover)] disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar item, risco ou referência"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] py-3 pl-9 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
              />
            </div>
            <button onClick={adicionarBloco} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] px-4 py-3 text-sm font-black text-[var(--brand)] transition hover:border-[var(--brand)]/60 hover:bg-[var(--brand-muted)]">
              <Plus size={16} />
              Novo setor
            </button>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            {filtrados.map(bloco => {
              const active = bloco.id === blocoAtivo
              return (
                <button
                  key={bloco.id}
                  onClick={() => setBlocoAtivo(bloco.id)}
                  className={`w-full border-b border-[var(--border)] px-4 py-4 text-left transition last:border-b-0 ${active ? 'bg-[var(--brand-muted)]' : 'hover:bg-[var(--bg-elevated)]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-2 ${active ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-primary)] text-[var(--brand)]'}`}>
                      <ClipboardList size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-[var(--text-primary)]">{bloco.titulo}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-muted)]">{bloco.ref} - {bloco.itens.length} itens</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="min-w-0">
          {blocoSelecionado ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow)]">
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">Nome do setor</span>
                    <input
                      value={blocoSelecionado.titulo}
                      onChange={e => updateBloco(blocoSelecionado.id, { titulo: e.target.value })}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-base font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">Referência</span>
                    <input
                      value={blocoSelecionado.ref}
                      onChange={e => updateBloco(blocoSelecionado.id, { ref: e.target.value })}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-base font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
                    />
                  </label>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--success)]">
                    <CheckCircle2 size={17} />
                    Alterações entram nas próximas vistorias; relatórios antigos mantêm o texto salvo.
                  </div>
                  <button onClick={() => adicionarItem(blocoSelecionado.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[var(--brand-hover)]">
                    <Plus size={16} />
                    Adicionar item
                  </button>
                </div>
              </div>

              {blocoSelecionado.itens.map((item, index) => (
                <div key={item.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase text-[var(--brand)]">Item {index + 1}</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text-muted)]">{item.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => duplicarItem(blocoSelecionado.id, item.id)} className="rounded-xl border border-[var(--border)] p-2 text-[var(--text-muted)] transition hover:text-[var(--brand)]" title="Duplicar item">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => removerItem(blocoSelecionado.id, item.id)} className="rounded-xl border border-[var(--border)] p-2 text-[var(--text-muted)] transition hover:border-red-300 hover:text-red-500" title="Remover item">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[var(--text-secondary)]">Pergunta / critério</span>
                      <textarea
                        value={item.t}
                        onChange={e => updateItem(blocoSelecionado.id, item.id, { t: e.target.value })}
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[var(--text-secondary)]">Referência</span>
                      <input
                        value={item.ref}
                        onChange={e => updateItem(blocoSelecionado.id, item.id, { ref: e.target.value })}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[var(--text-secondary)]">Risco</span>
                      <select value={item.nivel} onChange={e => updateItem(blocoSelecionado.id, item.id, { nivel: e.target.value as NivelRisco })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]">
                        {niveis.map(nivel => <option key={nivel.value} value={nivel.value}>{nivel.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[var(--text-secondary)]">Multa</span>
                      <select value={item.multa} onChange={e => updateItem(blocoSelecionado.id, item.id, { multa: e.target.value as GrauMulta })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]">
                        {multas.map(multa => <option key={multa.value} value={multa.value}>{multa.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-bold text-[var(--text-secondary)]">Perigo / tema</span>
                      <input
                        value={item.perigo}
                        onChange={e => updateItem(blocoSelecionado.id, item.id, { perigo: e.target.value })}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">Texto legal / orientação técnica</span>
                    <textarea
                      value={item.nr}
                      onChange={e => updateItem(blocoSelecionado.id, item.id, { nr: e.target.value })}
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center text-[var(--text-muted)]">
              Nenhum setor selecionado.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
