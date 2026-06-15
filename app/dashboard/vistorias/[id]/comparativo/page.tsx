'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CHECKLIST, type ChecklistBloco } from '@/lib/checklist-data'
import { findChecklistItem, loadChecklistModelo } from '@/lib/checklist-runtime'
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Status = 'C' | 'NC' | 'NA' | string

interface VistoriaResumo {
  id: string
  numero: string
  data_vistoria: string
  indice_conformidade: number | null
  classificacao: string | null
  total_nao_conformes: number | null
  obra_id: string
  consultoria_id: string
  clima?: string | null
  etapa_obra?: string | null
  obra?: { name: string; empresa_cliente?: { name: string } | null } | null
}

interface ItemRow {
  id: string
  item_id: string
  bloco_id: string
  status: Status
  observacao: string | null
  item_texto: string | null
  item_ref: string | null
  item_nivel: string | null
  item_multa: string | null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value + 'T12:00:00').toLocaleDateString('pt-BR')
}

function statusLabel(status?: Status) {
  if (status === 'C') return 'Conforme'
  if (status === 'NC') return 'Não conforme'
  if (status === 'NA') return 'N/A'
  return 'Não avaliado'
}

function statusTone(status?: Status) {
  if (status === 'C') return 'bg-[#EAF3DE] text-[#27500A]'
  if (status === 'NC') return 'bg-[#FCEBEB] text-[#791F1F]'
  if (status === 'NA') return 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
  return 'bg-[var(--bg-primary)] text-[var(--text-muted)]'
}

const STATUS_COLORS: Record<string, string> = {
  C: '#3B6D11',
  NC: '#A32D2D',
  NA: '#888780',
}

const EVOLUCAO_COLORS: Record<string, string> = {
  Resolvidas: '#3B6D11',
  Melhorias: '#0E7490',
  Persistentes: '#854F0B',
  Pioras: '#C2410C',
  Novas: '#A32D2D',
}

const NIVEL_COLORS: Record<string, string> = {
  grave: '#A32D2D',
  alto: '#C2410C',
  medio: '#185FA5',
  baixo: '#3B6D11',
}

const NIVEL_LABEL: Record<string, string> = {
  grave: 'Grave',
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo',
}

function nivelPeso(nivel?: string | null) {
  if (nivel === 'grave') return 4
  if (nivel === 'alto') return 3
  if (nivel === 'medio') return 2
  return 1
}

function itemMeta(checklist: ChecklistBloco[], item?: ItemRow) {
  const base = item ? findChecklistItem(checklist, item.item_id) : null
  return {
    texto: base?.t || item?.item_texto || 'Item avaliado',
    ref: base?.ref || item?.item_ref || '',
    nivel: base?.nivel || item?.item_nivel || 'medio',
    multa: base?.multa || item?.item_multa || 'i2',
    bloco: checklist.find(bloco => bloco.id === item?.bloco_id),
  }
}

function prazoAcao(nivel?: string | null, tipo?: string) {
  if (nivel === 'grave' || tipo === 'piora' || tipo === 'nova') return 'Imediato a 7 dias'
  if (nivel === 'alto' || tipo === 'persistente') return 'Até 15 dias'
  return 'Até 30 dias'
}

function custoEstimado(nivel?: string | null) {
  if (nivel === 'grave') return 'Médio/alto'
  if (nivel === 'alto') return 'Médio'
  return 'Baixo/médio'
}

export default function ComparativoPage() {
  const router = useRouter()
  const params = useParams()
  const vistoriaId = params.id as string

  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistBloco[]>(CHECKLIST)
  const [atual, setAtual] = useState<VistoriaResumo | null>(null)
  const [anterior, setAnterior] = useState<VistoriaResumo | null>(null)
  const [itensAtual, setItensAtual] = useState<ItemRow[]>([])
  const [itensAnterior, setItensAnterior] = useState<ItemRow[]>([])

  useEffect(() => { loadData() }, [vistoriaId])

  async function loadData() {
    try {
      const { data: current } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, indice_conformidade, classificacao, total_nao_conformes, obra_id, consultoria_id, clima, etapa_obra, obra:obras(name, empresa_cliente:empresas_clientes(name))')
        .eq('id', vistoriaId)
        .single()

      if (!current) { toast.error('Vistoria não encontrada'); return }
      const currentRow = current as any as VistoriaResumo
      setAtual(currentRow)

      const modelo = await loadChecklistModelo(supabase, currentRow.consultoria_id)
      setChecklist(modelo)

      const { data: previous } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, indice_conformidade, classificacao, total_nao_conformes, obra_id, consultoria_id, clima, etapa_obra, obra:obras(name, empresa_cliente:empresas_clientes(name))')
        .eq('obra_id', currentRow.obra_id)
        .in('status', ['concluida', 'assinada'])
        .neq('id', vistoriaId)
        .lte('data_vistoria', currentRow.data_vistoria)
        .order('data_vistoria', { ascending: false })
        .limit(1)

      const previousRow = previous?.[0] as any as VistoriaResumo | undefined
      if (previousRow) setAnterior(previousRow)

      const [{ data: currentItems }, { data: previousItems }] = await Promise.all([
        supabase.from('vistoria_itens').select('id, item_id, bloco_id, status, observacao, item_texto, item_ref, item_nivel, item_multa').eq('vistoria_id', vistoriaId),
        previousRow
          ? supabase.from('vistoria_itens').select('id, item_id, bloco_id, status, observacao, item_texto, item_ref, item_nivel, item_multa').eq('vistoria_id', previousRow.id)
          : Promise.resolve({ data: [] }),
      ])

      setItensAtual((currentItems || []) as ItemRow[])
      setItensAnterior((previousItems || []) as ItemRow[])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar comparativo')
    } finally {
      setLoading(false)
    }
  }

  const comparativo = useMemo(() => {
    const anteriorMap = new Map(itensAnterior.map(item => [item.item_id, item]))
    const atualMap = new Map(itensAtual.map(item => [item.item_id, item]))
    const ids = Array.from(new Set([...itensAnterior.map(i => i.item_id), ...itensAtual.map(i => i.item_id)]))

    const linhas = ids.map(itemId => {
      const antes = anteriorMap.get(itemId)
      const depois = atualMap.get(itemId)
      const ref = depois || antes
      const meta = itemMeta(checklist, ref)
      let tipo: 'melhoria' | 'piora' | 'resolvida' | 'nova' | 'persistente' | 'mantida' = 'mantida'

      if (antes?.status === 'NC' && depois?.status === 'C') tipo = 'resolvida'
      else if (antes?.status === 'NC' && depois?.status === 'NA') tipo = 'melhoria'
      else if (antes?.status === 'C' && depois?.status === 'NC') tipo = 'piora'
      else if (!antes && depois?.status === 'NC') tipo = 'nova'
      else if (antes?.status === 'NC' && depois?.status === 'NC') tipo = 'persistente'
      else if (antes?.status !== depois?.status) tipo = depois?.status === 'NC' ? 'piora' : 'melhoria'

      return { itemId, antes, depois, meta, tipo }
    })

    const countStatus = (items: ItemRow[], status: Status) => items.filter(i => i.status === status).length
    const pendentes = linhas.filter(l => ['piora', 'nova', 'persistente'].includes(l.tipo) && l.depois?.status === 'NC')
    const porNivel = ['grave', 'alto', 'medio', 'baixo'].map(nivel => {
      const itensNivel = linhas.filter(l => l.meta.nivel === nivel)
      return {
        nivel: NIVEL_LABEL[nivel],
        resolvidas: itensNivel.filter(l => l.tipo === 'resolvida').length,
        pendentes: itensNivel.filter(l => ['piora', 'nova', 'persistente'].includes(l.tipo) && l.depois?.status === 'NC').length,
        color: NIVEL_COLORS[nivel],
      }
    })
    const setoresMap = new Map<string, { setor: string; pendentes: number; resolvidas: number; total: number }>()
    linhas.forEach(linha => {
      const setor = linha.meta.bloco?.ref || 'Setor'
      const current = setoresMap.get(setor) || { setor, pendentes: 0, resolvidas: 0, total: 0 }
      current.total += 1
      if (linha.tipo === 'resolvida') current.resolvidas += 1
      if (['piora', 'nova', 'persistente'].includes(linha.tipo) && linha.depois?.status === 'NC') current.pendentes += 1
      setoresMap.set(setor, current)
    })
    const setoresCriticos = Array.from(setoresMap.values())
      .sort((a, b) => b.pendentes - a.pendentes || b.total - a.total)
      .slice(0, 6)

    const planoAcao = pendentes
      .sort((a, b) => nivelPeso(b.meta.nivel) - nivelPeso(a.meta.nivel))
      .slice(0, 6)
      .map(linha => ({
        itemId: linha.itemId,
        prioridade: linha.meta.nivel === 'grave' ? 'Alta' : linha.meta.nivel === 'alto' ? 'Média alta' : 'Média',
        what: linha.meta.texto,
        why: linha.tipo === 'persistente'
          ? 'Não conformidade permaneceu após a reavaliação.'
          : linha.tipo === 'nova'
            ? 'Não conformidade nova identificada na reavaliação.'
            : 'Condição piorou em relação à vistoria anterior.',
        where: `${linha.meta.bloco?.ref || 'Setor'}${linha.meta.ref ? ` - item ${linha.meta.ref}` : ''}`,
        who: 'Responsável técnico da obra / encarregado do setor',
        when: prazoAcao(linha.meta.nivel, linha.tipo),
        how: 'Corrigir a condição observada, registrar evidência fotográfica, orientar equipe e reavaliar o item no próximo ciclo.',
        howMuch: custoEstimado(linha.meta.nivel),
      }))

    return {
      linhas,
      resolvidas: linhas.filter(l => l.tipo === 'resolvida').length,
      melhorias: linhas.filter(l => l.tipo === 'melhoria' || l.tipo === 'resolvida').length,
      pioras: linhas.filter(l => l.tipo === 'piora' || l.tipo === 'nova').length,
      novas: linhas.filter(l => l.tipo === 'nova').length,
      persistentes: linhas.filter(l => l.tipo === 'persistente').length,
      atualNC: itensAtual.filter(i => i.status === 'NC').length,
      anteriorNC: itensAnterior.filter(i => i.status === 'NC').length,
      statusAnterior: [
        { name: 'Conforme', value: countStatus(itensAnterior, 'C'), key: 'C' },
        { name: 'Não conforme', value: countStatus(itensAnterior, 'NC'), key: 'NC' },
        { name: 'N/A', value: countStatus(itensAnterior, 'NA'), key: 'NA' },
      ],
      statusAtual: [
        { name: 'Conforme', value: countStatus(itensAtual, 'C'), key: 'C' },
        { name: 'Não conforme', value: countStatus(itensAtual, 'NC'), key: 'NC' },
        { name: 'N/A', value: countStatus(itensAtual, 'NA'), key: 'NA' },
      ],
      evolucaoData: [
        { name: 'Resolvidas', value: linhas.filter(l => l.tipo === 'resolvida').length },
        { name: 'Melhorias', value: linhas.filter(l => l.tipo === 'melhoria').length },
        { name: 'Persistentes', value: linhas.filter(l => l.tipo === 'persistente').length },
        { name: 'Pioras', value: linhas.filter(l => l.tipo === 'piora').length },
        { name: 'Novas', value: linhas.filter(l => l.tipo === 'nova').length },
      ],
      indiceData: [
        { name: 'Anterior', indice: anterior?.indice_conformidade || 0, ncs: itensAnterior.filter(i => i.status === 'NC').length },
        { name: 'Atual', indice: atual?.indice_conformidade || 0, ncs: itensAtual.filter(i => i.status === 'NC').length },
      ],
      porNivel,
      setoresCriticos,
      planoAcao,
    }
  }, [itensAnterior, itensAtual, checklist, anterior?.indice_conformidade, atual?.indice_conformidade])

  async function criarReavaliacaoCompleta() {
    if (!atual) return
    setCriando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { count } = await supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('consultoria_id', atual.consultoria_id)
      const numero = `${String((count || 0) + 1).padStart(3, '0')}/${new Date().getFullYear()}`
      const { data, error } = await supabase.from('vistorias').insert({
        obra_id: atual.obra_id,
        consultoria_id: atual.consultoria_id,
        avaliador_id: user.id,
        numero,
        data_vistoria: new Date().toISOString().split('T')[0],
        clima: atual.clima || 'Bom / ensolarado',
        etapa_obra: atual.etapa_obra || '',
        observacoes_gerais: `Reavaliação baseada na vistoria ${atual.numero}.`,
        status: 'em_andamento',
      }).select('id').single()
      if (error) throw error
      router.push(`/dashboard/vistorias/${data.id}?base=${atual.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar reavaliação')
    } finally {
      setCriando(false)
    }
  }

  const deltaIndice = (atual?.indice_conformidade || 0) - (anterior?.indice_conformidade || 0)
  const obraNome = atual?.obra?.empresa_cliente?.name || atual?.obra?.name || 'Obra'
  const reducaoNcs = comparativo.anteriorNC - comparativo.atualNC
  const taxaResolucao = comparativo.anteriorNC > 0 ? Math.round((comparativo.resolvidas / comparativo.anteriorNC) * 100) : 0
  const leituraTecnica = deltaIndice > 0 && reducaoNcs > 0
    ? 'A reavaliação indica evolução positiva do controle operacional, com aumento do índice de conformidade e redução das não conformidades. A prioridade passa a ser eliminar pendências persistentes e impedir recorrência.'
    : deltaIndice >= 0 && comparativo.persistentes > 0
      ? 'O cenário apresenta estabilidade com pendências remanescentes. A manutenção de não conformidades exige atuação direcionada por responsável, prazo e evidência objetiva de correção.'
      : 'A reavaliação aponta piora ou surgimento de novas não conformidades. Recomenda-se ação corretiva imediata, reforço de supervisão e nova verificação em curto prazo.'
  const focoTecnico = comparativo.porNivel.find(n => n.pendentes > 0)?.nivel || 'Baixo'

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 size={30} className="animate-spin text-[var(--brand)]" />
      </div>
    )
  }

  if (!atual) return null

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-surface)]/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button onClick={() => router.push('/dashboard/vistorias/' + vistoriaId + '/relatorio')} className="rounded-2xl p-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]" aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-[var(--text-primary)]">Relatório comparativo</h1>
            <p className="truncate text-sm text-[var(--text-muted)]">{obraNome} - vistoria {atual.numero}</p>
          </div>
          <button onClick={criarReavaliacaoCompleta} disabled={criando} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--brand-muted)] transition hover:bg-[var(--brand-hover)] disabled:opacity-60">
            {criando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Nova reavaliação
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {!anterior ? (
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center shadow-[var(--shadow)]">
            <GitCompareArrows size={42} className="mx-auto text-[var(--brand)]" />
            <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">Ainda não existe vistoria anterior para comparar</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
              Quando você concluir uma nova reavaliação da mesma obra, este painel mostrará melhorias, pioras e criticidade por item.
            </p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[30px] border border-[var(--border)] bg-[linear-gradient(135deg,#0f172a,var(--brand))] p-6 text-white shadow-[var(--shadow)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-bold">
                  <GitCompareArrows size={16} />
                  Evolução entre relatórios
                </div>
                <h2 className="mt-5 text-3xl font-black leading-tight">Da vistoria {anterior.numero} para {atual.numero}</h2>
                <p className="mt-3 text-blue-50/85">
                  Comparação automática por item: o sistema identifica o que foi resolvido, o que piorou, o que surgiu agora e o que segue crítico.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Anterior', value: `${anterior.indice_conformidade || 0}%` },
                    { label: 'Atual', value: `${atual.indice_conformidade || 0}%` },
                    { label: 'Variação', value: `${deltaIndice > 0 ? '+' : ''}${Math.round(deltaIndice * 100) / 100} p.p.` },
                    { label: 'NCs atuais', value: comparativo.atualNC },
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl border border-white/12 bg-white/10 p-4">
                      <div className="text-2xl font-black">{item.value}</div>
                      <div className="mt-1 text-sm text-blue-50/75">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow)]">
                <div className="text-sm font-black text-[var(--brand)]">Linha do tempo</div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-[var(--bg-primary)] p-4">
                    <div className="text-xs font-bold text-[var(--text-muted)]">Vistoria anterior</div>
                    <div className="mt-1 text-lg font-black text-[var(--text-primary)]">{anterior.numero}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{formatDate(anterior.data_vistoria)} - {anterior.classificacao}</div>
                  </div>
                  <div className="rounded-2xl bg-[var(--brand-muted)] p-4">
                    <div className="text-xs font-bold text-[var(--brand)]">Vistoria atual</div>
                    <div className="mt-1 text-lg font-black text-[var(--text-primary)]">{atual.numero}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{formatDate(atual.data_vistoria)} - {atual.classificacao}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[
                { label: 'Melhorias', value: comparativo.melhorias, icon: TrendingUp, tone: 'bg-[#EAF3DE] text-[#27500A]' },
                { label: 'Resolvidas', value: comparativo.resolvidas, icon: CheckCircle2, tone: 'bg-[#EAF3DE] text-[#27500A]' },
                { label: 'Pioras', value: comparativo.pioras, icon: TrendingDown, tone: 'bg-[#FCEBEB] text-[#791F1F]' },
                { label: 'Novas NCs', value: comparativo.novas, icon: XCircle, tone: 'bg-[#FCEBEB] text-[#791F1F]' },
                { label: 'Persistentes', value: comparativo.persistentes, icon: ShieldAlert, tone: 'bg-[#FAEEDA] text-[#633806]' },
              ].map(item => (
                <div key={item.label} className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm">
                  <div className={`mb-4 inline-flex rounded-2xl p-3 ${item.tone}`}>
                    <item.icon size={22} />
                  </div>
                  <div className="text-4xl font-black text-[var(--text-primary)]">{item.value}</div>
                  <div className="mt-1 text-sm font-bold text-[var(--text-muted)]">{item.label}</div>
                </div>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-muted)] px-3 py-1 text-xs font-black text-[var(--brand)]">
                      <BarChart3 size={14} />
                      Índice x NCs
                    </div>
                    <h3 className="mt-3 text-2xl font-black text-[var(--text-primary)]">Evolução de desempenho</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Comparação do índice de conformidade e do volume de não conformidades.</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-right ${deltaIndice >= 0 ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FCEBEB] text-[#791F1F]'}`}>
                    <div className="text-2xl font-black">{deltaIndice > 0 ? '+' : ''}{Math.round(deltaIndice * 100) / 100}</div>
                    <div className="text-xs font-bold">pontos percentuais</div>
                  </div>
                </div>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativo.indiceData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-primary)' }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="indice" name="Índice (%)" radius={[10, 10, 0, 0]} fill="#185FA5" />
                      <Bar yAxisId="right" dataKey="ncs" name="Não conformidades" radius={[10, 10, 0, 0]} fill="#A32D2D" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow)]">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F1EFE8] px-3 py-1 text-xs font-black text-[#555552]">
                  <Target size={14} />
                  Situação atual
                </div>
                <h3 className="mt-3 text-2xl font-black text-[var(--text-primary)]">Distribuição dos itens</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Leitura rápida do resultado da reavaliação.</p>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={comparativo.statusAtual.filter(i => i.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={4}>
                        {comparativo.statusAtual.filter(i => i.value > 0).map(item => (
                          <Cell key={item.key} fill={STATUS_COLORS[item.key]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-primary)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm xl:col-span-2">
                <h3 className="text-xl font-black text-[var(--text-primary)]">Mapa da evolução</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Classificação automática do que mudou entre as duas vistorias.</p>
                <div className="mt-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativo.evolucaoData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-primary)' }} />
                      <Bar dataKey="value" name="Itens" radius={[10, 10, 0, 0]}>
                        {comparativo.evolucaoData.map(item => (
                          <Cell key={item.name} fill={EVOLUCAO_COLORS[item.name]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm">
                <h3 className="text-xl font-black text-[var(--text-primary)]">Criticidade pendente</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Pendências atuais por nível de risco.</p>
                <div className="mt-5 space-y-4">
                  {comparativo.porNivel.map(item => {
                    const total = Math.max(item.pendentes + item.resolvidas, 1)
                    return (
                      <div key={item.nivel}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-[var(--text-primary)]">{item.nivel}</span>
                          <span className="text-[var(--text-muted)]">{item.pendentes} pend. / {item.resolvidas} resolv.</span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.pendentes / total) * 100)}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow)]">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E6F1FB] px-3 py-1 text-xs font-black text-[#0C447C]">
                  <ShieldAlert size={14} />
                  Análise técnica
                </div>
                <h3 className="mt-4 text-2xl font-black text-[var(--text-primary)]">Leitura da reavaliação</h3>
                <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">{leituraTecnica}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[var(--bg-primary)] p-4">
                    <div className="text-2xl font-black text-[var(--text-primary)]">{taxaResolucao}%</div>
                    <div className="mt-1 text-xs font-bold text-[var(--text-muted)]">taxa de resolução</div>
                  </div>
                  <div className="rounded-2xl bg-[var(--bg-primary)] p-4">
                    <div className={`text-2xl font-black ${reducaoNcs >= 0 ? 'text-[#3B6D11]' : 'text-[#A32D2D]'}`}>{reducaoNcs >= 0 ? '-' : '+'}{Math.abs(reducaoNcs)}</div>
                    <div className="mt-1 text-xs font-bold text-[var(--text-muted)]">variação de NCs</div>
                  </div>
                  <div className="rounded-2xl bg-[var(--bg-primary)] p-4">
                    <div className="text-2xl font-black text-[var(--text-primary)]">{focoTecnico}</div>
                    <div className="mt-1 text-xs font-bold text-[var(--text-muted)]">maior foco</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow)]">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FAEEDA] px-3 py-1 text-xs font-black text-[#633806]">
                  <ClipboardList size={14} />
                  Setores críticos
                </div>
                <h3 className="mt-4 text-2xl font-black text-[var(--text-primary)]">Onde concentrar a gestão</h3>
                <div className="mt-5 space-y-3">
                  {comparativo.setoresCriticos.length === 0 ? (
                    <p className="rounded-2xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-muted)]">Não há setores críticos pendentes nesta comparação.</p>
                  ) : comparativo.setoresCriticos.map(setor => (
                    <div key={setor.setor} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-black text-[var(--text-primary)]">{setor.setor}</div>
                        <div className="text-sm font-bold text-[#A32D2D]">{setor.pendentes} pendências</div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                        <div className="h-full rounded-full bg-[#A32D2D]" style={{ width: `${Math.min(100, (setor.pendentes / Math.max(setor.total, 1)) * 100)}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-[var(--text-muted)]">{setor.resolvidas} resolvidas em {setor.total} itens comparados</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow)]">
              <div className="border-b border-[var(--border)] px-5 py-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3DE] px-3 py-1 text-xs font-black text-[#27500A]">
                  <ClipboardList size={14} />
                  Plano 5W2H
                </div>
                <h3 className="mt-3 text-2xl font-black text-[var(--text-primary)]">Ações recomendadas</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Plano simples para tratar novas NCs, pioras e pendências persistentes.</p>
              </div>
              {comparativo.planoAcao.length === 0 ? (
                <div className="p-6 text-sm text-[var(--text-muted)]">Não há não conformidades pendentes para compor plano de ação nesta reavaliação.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-[var(--bg-primary)] text-xs uppercase text-[var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-3">Prioridade</th>
                        <th className="px-4 py-3">O que</th>
                        <th className="px-4 py-3">Por quê</th>
                        <th className="px-4 py-3">Onde</th>
                        <th className="px-4 py-3">Quem</th>
                        <th className="px-4 py-3">Quando</th>
                        <th className="px-4 py-3">Como</th>
                        <th className="px-4 py-3">Quanto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {comparativo.planoAcao.map(acao => (
                        <tr key={acao.itemId} className="align-top">
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-[#FCEBEB] px-3 py-1 text-xs font-black text-[#791F1F]">{acao.prioridade}</span>
                          </td>
                          <td className="max-w-[260px] px-4 py-4 font-bold text-[var(--text-primary)]">{acao.what}</td>
                          <td className="px-4 py-4 text-[var(--text-secondary)]">{acao.why}</td>
                          <td className="px-4 py-4 text-[var(--text-secondary)]">{acao.where}</td>
                          <td className="px-4 py-4 text-[var(--text-secondary)]">{acao.who}</td>
                          <td className="px-4 py-4 font-bold text-[var(--text-primary)]">{acao.when}</td>
                          <td className="max-w-[260px] px-4 py-4 text-[var(--text-secondary)]">{acao.how}</td>
                          <td className="px-4 py-4 text-[var(--text-secondary)]">{acao.howMuch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow)]">
              <div className="border-b border-[var(--border)] px-5 py-5">
                <h3 className="text-2xl font-black text-[var(--text-primary)]">Itens comparados</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Priorizando melhorias, pioras e criticidades persistentes.</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {comparativo.linhas
                  .filter(linha => linha.tipo !== 'mantida')
                  .sort((a, b) => {
                    const order = { piora: 0, nova: 1, persistente: 2, resolvida: 3, melhoria: 4, mantida: 5 }
                    return order[a.tipo] - order[b.tipo]
                  })
                  .map(linha => {
                    const typeConfig = {
                      resolvida: 'bg-[#EAF3DE] text-[#27500A]',
                      melhoria: 'bg-[#EAF3DE] text-[#27500A]',
                      piora: 'bg-[#FCEBEB] text-[#791F1F]',
                      nova: 'bg-[#FCEBEB] text-[#791F1F]',
                      persistente: 'bg-[#FAEEDA] text-[#633806]',
                      mantida: 'bg-[var(--bg-primary)] text-[var(--text-muted)]',
                    }[linha.tipo]
                    return (
                      <div key={linha.itemId} className="p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-black ${typeConfig}`}>{linha.tipo}</span>
                              <span className="text-xs font-mono text-[var(--brand)]">{linha.meta.ref}</span>
                              <span className="text-xs text-[var(--text-muted)]">{linha.meta.bloco?.ref}</span>
                            </div>
                            <p className="mt-2 text-base font-bold text-[var(--text-primary)]">{linha.meta.texto}</p>
                            {(linha.antes?.observacao || linha.depois?.observacao) && (
                              <div className="mt-3 grid gap-2 md:grid-cols-2">
                                {linha.antes?.observacao && <p className="rounded-2xl bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-muted)]">Antes: {linha.antes.observacao}</p>}
                                {linha.depois?.observacao && <p className="rounded-2xl bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-muted)]">Atual: {linha.depois.observacao}</p>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(linha.antes?.status)}`}>{statusLabel(linha.antes?.status)}</span>
                            <ArrowUpRight size={16} className="text-[var(--text-muted)]" />
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(linha.depois?.status)}`}>{statusLabel(linha.depois?.status)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
