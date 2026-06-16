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
  Download,
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
  vistoria_id?: string
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

const PDF = {
  brand: '#2563EB',
  brandDark: '#12356F',
  ink: '#111827',
  muted: '#64748B',
  line: '#D9E2EC',
  bg: '#F6F8FC',
  green: '#2F7D32',
  amber: '#B7791F',
  red: '#A32D2D',
  blue: '#185FA5',
  cyan: '#0E7490',
  orange: '#C2410C',
  greenSoft: '#EAF3DE',
  amberSoft: '#FAEEDA',
  redSoft: '#FCEBEB',
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

async function imageToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
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
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistBloco[]>(CHECKLIST)
  const [atual, setAtual] = useState<VistoriaResumo | null>(null)
  const [anterior, setAnterior] = useState<VistoriaResumo | null>(null)
  const [itensAtual, setItensAtual] = useState<ItemRow[]>([])
  const [itensAnterior, setItensAnterior] = useState<ItemRow[]>([])
  const [historicoVistorias, setHistoricoVistorias] = useState<VistoriaResumo[]>([])
  const [historicoItens, setHistoricoItens] = useState<ItemRow[]>([])

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

      const { data: allInspections } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, indice_conformidade, classificacao, total_nao_conformes, obra_id, consultoria_id, clima, etapa_obra, obra:obras(name, empresa_cliente:empresas_clientes(name))')
        .eq('obra_id', currentRow.obra_id)
        .in('status', ['concluida', 'assinada'])
        .lte('data_vistoria', currentRow.data_vistoria)
        .order('data_vistoria', { ascending: true })

      const historyMap = new Map<string, VistoriaResumo>()
      ;((allInspections || []) as any as VistoriaResumo[]).forEach(v => historyMap.set(v.id, v))
      historyMap.set(currentRow.id, currentRow)
      const historyRows = Array.from(historyMap.values())
        .filter(v => v.data_vistoria <= currentRow.data_vistoria)
        .sort((a, b) => {
          const dateOrder = a.data_vistoria.localeCompare(b.data_vistoria)
          return dateOrder !== 0 ? dateOrder : a.numero.localeCompare(b.numero)
        })
      setHistoricoVistorias(historyRows)

      const currentIndex = historyRows.findIndex(v => v.id === vistoriaId)
      const previousRow = currentIndex > 0 ? historyRows[currentIndex - 1] : undefined
      if (previousRow) setAnterior(previousRow)

      const historyIds = historyRows.map(v => v.id)
      const { data: allItems } = historyIds.length > 0
        ? await supabase.from('vistoria_itens').select('id, vistoria_id, item_id, bloco_id, status, observacao, item_texto, item_ref, item_nivel, item_multa').in('vistoria_id', historyIds)
        : { data: [] }
      const items = (allItems || []) as ItemRow[]

      setHistoricoItens(items)
      setItensAtual(items.filter(item => item.vistoria_id === vistoriaId))
      setItensAnterior(previousRow ? items.filter(item => item.vistoria_id === previousRow.id) : [])
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

  const historico = useMemo(() => {
    const inspecoes = [...historicoVistorias]
      .sort((a, b) => {
        const dateOrder = a.data_vistoria.localeCompare(b.data_vistoria)
        return dateOrder !== 0 ? dateOrder : a.numero.localeCompare(b.numero)
      })
      .map(v => {
        const itens = historicoItens.filter(item => item.vistoria_id === v.id)
        const conformes = itens.filter(i => i.status === 'C').length
        const ncs = itens.filter(i => i.status === 'NC').length
        const na = itens.filter(i => i.status === 'NA').length
        const aplicaveis = itens.length - na
        const indice = v.indice_conformidade ?? (aplicaveis > 0 ? Math.round((conformes / aplicaveis) * 10000) / 100 : 0)
        return {
          ...v,
          total: itens.length,
          conformes,
          ncs,
          na,
          indice,
        }
      })

    const transicoes = inspecoes.slice(1).map((atualInspecao, idx) => {
      const anteriorInspecao = inspecoes[idx]
      const anteriorMap = new Map(historicoItens.filter(i => i.vistoria_id === anteriorInspecao.id).map(i => [i.item_id, i]))
      const atualMap = new Map(historicoItens.filter(i => i.vistoria_id === atualInspecao.id).map(i => [i.item_id, i]))
      const ids = Array.from(new Set([...Array.from(anteriorMap.keys()), ...Array.from(atualMap.keys())]))
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
      return {
        de: anteriorInspecao,
        para: atualInspecao,
        deltaIndice: Math.round(((atualInspecao.indice || 0) - (anteriorInspecao.indice || 0)) * 100) / 100,
        deltaNCs: (atualInspecao.ncs || 0) - (anteriorInspecao.ncs || 0),
        resolvidas: linhas.filter(l => l.tipo === 'resolvida').length,
        melhorias: linhas.filter(l => l.tipo === 'melhoria' || l.tipo === 'resolvida').length,
        pioras: linhas.filter(l => l.tipo === 'piora' || l.tipo === 'nova').length,
        novas: linhas.filter(l => l.tipo === 'nova').length,
        persistentes: linhas.filter(l => l.tipo === 'persistente').length,
      }
    })

    const ultima = inspecoes[inspecoes.length - 1] || null
    const primeira = inspecoes[0] || null
    return { inspecoes, transicoes, primeira, ultima }
  }, [historicoVistorias, historicoItens, checklist])

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

  async function exportarPDF() {
    if (!atual) return
    if (historico.inspecoes.length < 2) {
      toast.error('Não há histórico suficiente para gerar comparativo')
      return
    }
    setGerandoPDF(true)
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const autoTable = (autoTableModule.default || autoTableModule.autoTable) as any
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const logoData = await imageToDataUrl('/branding/login-logo-login.png')
      const margin = 14
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const contentW = pageW - margin * 2
      const inspecoesHistoricas = historico.inspecoes
      const transicoesHistoricas = historico.transicoes
      const primeiraInspecao = (historico.primeira || atual) as any
      const ultimaInspecao = (historico.ultima || atual) as any
      let y = margin
      let secao = 1

      const currentPageW = () => doc.internal.pageSize.getWidth()
      const currentPageH = () => doc.internal.pageSize.getHeight()
      const color = (hex: string, target: 'text' | 'fill' | 'draw' = 'text') => {
        const [r, g, b] = hexToRgb(hex)
        if (target === 'text') doc.setTextColor(r, g, b)
        if (target === 'fill') doc.setFillColor(r, g, b)
        if (target === 'draw') doc.setDrawColor(r, g, b)
      }
      const text = (value: string, x: number, yy: number, size = 9, hex = PDF.ink, style: 'normal' | 'bold' = 'normal', options?: any) => {
        doc.setFont('helvetica', style)
        doc.setFontSize(size)
        color(hex, 'text')
        doc.text(value, x, yy, options)
      }
      const wrapText = (value: string, width: number, size = 9, style: 'normal' | 'bold' = 'normal') => {
        doc.setFont('helvetica', style)
        doc.setFontSize(size)
        const lines: string[] = []
        String(value || 'Não informado').split(/\n+/).forEach(part => {
          const words = part.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
          let current = ''
          words.forEach(word => {
            if (!current) { current = word; return }
            const candidate = `${current} ${word}`
            if (doc.getTextWidth(candidate) <= width) current = candidate
            else { lines.push(current); current = word }
          })
          if (current) lines.push(current)
        })
        return lines.length ? lines : ['Não informado']
      }
      const ensure = (space = 24) => {
        if (y + space <= currentPageH() - 20) return
        doc.addPage()
        addHeader()
      }
      const paragraph = (value: string, x = margin, width = contentW, size = 9, leading = 4.5, hex = PDF.ink) => {
        wrapText(value, width, size).forEach(line => {
          ensure(leading + 2)
          text(line, x, y, size, hex)
          y += leading
        })
      }
      const addHeader = (title = 'Relatório Comparativo NR-18') => {
        const w = currentPageW()
        color('#FFFFFF', 'fill')
        doc.rect(0, 0, w, 35, 'F')
        if (logoData) {
          try { doc.addImage(logoData, 'PNG', margin, 7, 38, 17) } catch {}
        }
        text(title, w - margin - 68, 14, 9.5, PDF.brandDark, 'bold')
        text(`Histórico consolidado: ${inspecoesHistoricas.length} inspeções analisadas`, w - margin - 86, 20, 6.8, PDF.muted)
        color(PDF.line, 'draw')
        doc.line(margin, 31, w - margin, 31)
        y = 39
      }
      const addFooter = () => {
        const total = doc.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
          doc.setPage(i)
          const w = currentPageW()
          const h = currentPageH()
          color(PDF.line, 'draw')
          doc.line(margin, h - 14, w - margin, h - 14)
          text('NR18 Check - Relatório comparativo gerado eletronicamente', margin, h - 8, 7, PDF.muted)
          text(`Página ${i} de ${total}`, w - margin, h - 8, 7, PDF.muted, 'normal', { align: 'right' })
        }
      }
      const sectionTitle = (title: string) => {
        ensure(18)
        text(`${secao}. ${title}`, margin, y, 13, PDF.brandDark, 'bold')
        color(PDF.brand, 'draw')
        doc.setLineWidth(0.6)
        doc.line(margin, y + 2.5, margin + 42, y + 2.5)
        y += 10
        secao += 1
      }
      const infoBox = (title: string, value: string, x: number, yy: number, w: number, h: number, fill = PDF.bg) => {
        color(fill, 'fill')
        color(PDF.line, 'draw')
        doc.roundedRect(x, yy, w, h, 2.5, 2.5, 'FD')
        text(title, x + 3, yy + 5, 7, PDF.muted, 'bold')
        const lines = wrapText(value || 'Não informado', w - 6, 8.2, 'bold').slice(0, Math.max(1, Math.floor((h - 11) / 4.4)))
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.2)
        color(PDF.ink, 'text')
        doc.text(lines, x + 3, yy + 10, { lineHeightFactor: 1.2 })
      }
      const metricCard = (label: string, value: string, x: number, yy: number, w: number, h: number, hex: string) => {
        color('#FFFFFF', 'fill')
        color(PDF.line, 'draw')
        doc.roundedRect(x, yy, w, h, 2.5, 2.5, 'FD')
        text(value, x + w / 2, yy + 9, 14, hex, 'bold', { align: 'center' })
        text(label, x + w / 2, yy + 15.5, 6.5, PDF.muted, 'normal', { align: 'center' })
      }
      const bar = (x: number, yy: number, w: number, h: number, pct: number, hex: string) => {
        color(PDF.line, 'fill')
        doc.roundedRect(x, yy, w, h, h / 2, h / 2, 'F')
        color(hex, 'fill')
        doc.roundedRect(x, yy, Math.max(0.8, (w * Math.min(100, Math.max(0, pct))) / 100), h, h / 2, h / 2, 'F')
      }
      const runTable = (options: any) => {
        autoTable(doc, {
          styles: { font: 'helvetica', fontSize: 7.4, cellPadding: 2, overflow: 'linebreak', valign: 'top', textColor: hexToRgb(PDF.ink), lineColor: hexToRgb(PDF.line), lineWidth: 0.08 },
          headStyles: { fillColor: hexToRgb(PDF.brandDark), textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: hexToRgb(PDF.bg) },
          margin: { top: 39, left: margin, right: margin, bottom: 20 },
          startY: y,
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1) addHeader()
          },
          ...options,
        })
        y = ((doc as any).lastAutoTable?.finalY || y) + 8
      }

      color('#FFFFFF', 'fill')
      doc.rect(0, 0, pageW, pageH, 'F')
      if (logoData) {
        try { doc.addImage(logoData, 'PNG', margin, 16, 62, 28) } catch {}
      }
      color(PDF.line, 'draw')
      doc.line(margin, 54, pageW - margin, 54)
      text('RELATÓRIO EVOLUTIVO DE REAVALIAÇÃO', margin, 75, 16, PDF.brandDark, 'bold')
      text('NR-18 - Evolução histórica, criticidade, melhorias, pioras e plano de ação', margin, 86, 10, PDF.ink, 'bold')
      text(`Comparação histórica consolidada da obra ${obraNome}`, margin, 94, 8.2, PDF.muted)
      infoBox('Empresa / obra', obraNome, margin, 110, contentW, 26)
      infoBox('Período analisado', `${formatDate(primeiraInspecao.data_vistoria)} até ${formatDate(ultimaInspecao.data_vistoria)}`, margin, 142, 88, 24)
      infoBox('Inspeções analisadas', String(inspecoesHistoricas.length), margin + 94, 142, 32, 24)
      infoBox('Primeira inspeção', `${primeiraInspecao.numero} | ${primeiraInspecao.classificacao || 'Não informado'}`, margin + 130, 142, 62, 24)
      infoBox('Última inspeção', `${ultimaInspecao.numero} | ${ultimaInspecao.classificacao || 'Não informado'}`, margin, 172, 88, 24)
      infoBox('Variação acumulada', `${((ultimaInspecao.indice || 0) - (primeiraInspecao.indice || 0)) > 0 ? '+' : ''}${Math.round((((ultimaInspecao.indice || 0) - (primeiraInspecao.indice || 0)) * 100)) / 100} pontos percentuais`, margin + 94, 172, 56, 24, (ultimaInspecao.indice || 0) >= (primeiraInspecao.indice || 0) ? PDF.greenSoft : PDF.redSoft)
      infoBox('NCs atuais', String(comparativo.atualNC), margin + 154, 172, 38, 24, PDF.bg)
      y = 206
      paragraph('Este documento consolida a comparação histórica de todas as inspeções disponíveis da obra, indicando a evolução do índice de conformidade, o comportamento das não conformidades, a criticidade remanescente, os setores prioritários e o plano de ação 5W2H para tratamento das pendências.', margin, contentW, 8.6, 4.3, PDF.muted)

      doc.addPage()
      addHeader()

      sectionTitle('Resumo Executivo')
      const cardW = 33
      const cardGap = 4
      const cardsStart = margin + (contentW - (cardW * 5 + cardGap * 4)) / 2
      ;[
        ['Melhorias', String(comparativo.melhorias), PDF.green],
        ['Resolvidas', String(comparativo.resolvidas), PDF.green],
        ['Pioras', String(comparativo.pioras), PDF.orange],
        ['Novas NCs', String(comparativo.novas), PDF.red],
        ['Persistentes', String(comparativo.persistentes), PDF.amber],
      ].forEach(([label, value, hex], idx) => metricCard(label, value, cardsStart + idx * (cardW + cardGap), y, cardW, 20, hex))
      y += 30
      paragraph(leituraTecnica, margin, contentW, 9, 4.6)

      sectionTitle('Linha do Tempo das Inspeções')
      runTable({
        head: [['Inspeção', 'Data', 'Classificação', 'Índice', 'NCs']],
        body: inspecoesHistoricas.map(v => [
          v.numero,
          formatDate(v.data_vistoria),
          v.classificacao || 'Não informado',
          `${Math.round((v.indice || 0) * 100) / 100}%`,
          String(v.ncs),
        ]),
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 28 },
          2: { cellWidth: 44 },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
        },
      })

      sectionTitle('Transições Entre Inspeções')
      if (transicoesHistoricas.length === 0) {
        paragraph('Não há transições históricas suficientes para cálculo evolutivo.')
      } else {
        runTable({
          head: [['De', 'Para', 'Delta índice', 'Delta NCs', 'Leitura técnica']],
          body: transicoesHistoricas.map(t => [
            t.de.numero,
            t.para.numero,
            `${t.deltaIndice > 0 ? '+' : ''}${t.deltaIndice} p.p.`,
            `${t.deltaNCs > 0 ? '+' : ''}${t.deltaNCs}`,
            t.deltaIndice > 0 && t.deltaNCs < 0
              ? 'Evolução positiva geral.'
              : t.deltaIndice >= 0
                ? 'Estabilidade ou avanço parcial.'
                : 'Requer atenção corretiva.',
          ]),
          columnStyles: {
            0: { cellWidth: 26, fontStyle: 'bold' },
            1: { cellWidth: 26, fontStyle: 'bold' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: contentW - 92 },
          },
        })
      }

      sectionTitle('Evolução de Indicadores')
      text('Índice de conformidade', margin, y, 9, PDF.brandDark, 'bold')
      text('Não conformidades', margin + 98, y, 9, PDF.brandDark, 'bold')
      y += 8
      ;[
        { label: 'Primeira', value: primeiraInspecao.indice || 0, ncs: inspecoesHistoricas[0]?.ncs || 0 },
        { label: 'Atual', value: atual.indice_conformidade || 0, ncs: comparativo.atualNC },
      ].forEach((item, idx) => {
        const yy = y + idx * 14
        text(item.label, margin, yy + 3, 8, PDF.ink)
        bar(margin + 24, yy, 56, 4.5, item.value, item.label === 'Atual' ? PDF.blue : PDF.muted)
        text(`${item.value}%`, margin + 84, yy + 3.5, 8, item.label === 'Atual' ? PDF.blue : PDF.muted, 'bold')
        text(item.label, margin + 98, yy + 3, 8, PDF.ink)
        bar(margin + 124, yy, 36, 4.5, Math.min(100, (item.ncs / Math.max(comparativo.anteriorNC, comparativo.atualNC, 1)) * 100), PDF.red)
        text(String(item.ncs), margin + 165, yy + 3.5, 8, PDF.red, 'bold')
      })
      y += 34

      sectionTitle('Mapa de Melhorias, Pioras e Recorrências')
      runTable({
        head: [['Evolução', 'Qtd.', 'Interpretação técnica']],
        body: [
          ['Resolvidas', comparativo.resolvidas, 'Não conformidades anteriores que passaram para condição conforme.'],
          ['Melhorias', comparativo.melhorias, 'Itens com evolução favorável, incluindo resoluções e mudanças para condição menos crítica.'],
          ['Persistentes', comparativo.persistentes, 'Não conformidades que permaneceram na reavaliação e exigem tratativa gerencial.'],
          ['Pioras', comparativo.pioras, 'Itens que pioraram em relação à vistoria anterior, incluindo novas não conformidades.'],
          ['Novas', comparativo.novas, 'Não conformidades identificadas apenas na vistoria atual.'],
        ],
        columnStyles: { 0: { cellWidth: 36, fontStyle: 'bold' }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: contentW - 54 } },
      })

      sectionTitle('Criticidade Pendente por Nível')
      comparativo.porNivel.forEach(item => {
        ensure(10)
        const total = Math.max(item.pendentes + item.resolvidas, 1)
        text(item.nivel, margin, y + 3, 8, PDF.ink, 'bold')
        bar(margin + 28, y, 86, 4.5, (item.pendentes / total) * 100, item.color)
        text(`${item.pendentes} pendentes | ${item.resolvidas} resolvidas`, margin + 120, y + 3.5, 7.5, PDF.muted)
        y += 9
      })
      y += 4

      sectionTitle('Setores Críticos')
      if (comparativo.setoresCriticos.length === 0) {
        paragraph('Não há setores críticos pendentes nesta comparação.')
      } else {
        runTable({
          head: [['Setor', 'Pendências', 'Resolvidas', 'Total comparado', 'Leitura técnica']],
          body: comparativo.setoresCriticos.map(setor => [
            setor.setor,
            String(setor.pendentes),
            String(setor.resolvidas),
            String(setor.total),
            setor.pendentes > 0 ? 'Requer acompanhamento e evidência objetiva de correção.' : 'Setor sem pendências críticas no comparativo.',
          ]),
          columnStyles: {
            0: { cellWidth: 34, fontStyle: 'bold' },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: contentW - 104 },
          },
        })
      }

      sectionTitle('Itens Alterados ou Críticos')
      const linhasRelevantes = comparativo.linhas
        .filter(linha => linha.tipo !== 'mantida')
        .sort((a, b) => {
          const order = { piora: 0, nova: 1, persistente: 2, resolvida: 3, melhoria: 4, mantida: 5 }
          return order[a.tipo] - order[b.tipo]
        })
      if (linhasRelevantes.length === 0) {
        paragraph('Não foram identificadas alterações relevantes entre as duas vistorias.')
      } else {
        runTable({
          head: [['Tipo', 'Ref.', 'Antes', 'Atual', 'Nível', 'Item / observações']],
          body: linhasRelevantes.map(linha => [
            linha.tipo,
            linha.meta.ref || '-',
            statusLabel(linha.antes?.status),
            statusLabel(linha.depois?.status),
            NIVEL_LABEL[linha.meta.nivel] || linha.meta.nivel,
            `${linha.meta.texto}${linha.antes?.observacao ? '\nAntes: ' + linha.antes.observacao : ''}${linha.depois?.observacao ? '\nAtual: ' + linha.depois.observacao : ''}`,
          ]),
          columnStyles: {
            0: { cellWidth: 22, fontStyle: 'bold' },
            1: { cellWidth: 20 },
            2: { cellWidth: 22 },
            3: { cellWidth: 22 },
            4: { cellWidth: 20 },
            5: { cellWidth: contentW - 106 },
          },
        })
      }

      sectionTitle('Parecer Técnico Comparativo')
      paragraph(`A análise histórica indica variação de ${((ultimaInspecao.indice || 0) - (primeiraInspecao.indice || 0)) > 0 ? '+' : ''}${Math.round(((ultimaInspecao.indice || 0) - (primeiraInspecao.indice || 0)) * 100) / 100} pontos percentuais entre a primeira e a última inspeção do período, com ${comparativo.atualNC} não conformidades na última medição. O foco técnico prioritário é ${focoTecnico.toLowerCase()}, com atenção especial aos itens classificados como persistentes, novos ou com piora em qualquer transição da série histórica. Recomenda-se registrar evidências de correção, validar a eficácia das ações e programar nova verificação para os itens pendentes dentro dos prazos definidos no plano 5W2H.`, margin, contentW, 9, 4.6)

      if (comparativo.planoAcao.length > 0) {
        doc.addPage('a4', 'landscape')
        const addAnexoHeader = () => {
          const w = currentPageW()
          color('#FFFFFF', 'fill')
          doc.rect(0, 0, w, 32, 'F')
          if (logoData) {
            try { doc.addImage(logoData, 'PNG', margin, 7, 36, 16) } catch {}
          }
          text('ANEXO I - Plano de Ação Comparativo 5W2H', w / 2, 15, 12, PDF.brandDark, 'bold', { align: 'center' })
          text(`${obraNome} | histórico consolidado de ${inspecoesHistoricas.length} inspeções`, w / 2, 22, 7.0, PDF.muted, 'normal', { align: 'center' })
          color(PDF.line, 'draw')
          doc.line(12, 29, w - 12, 29)
        }
        addAnexoHeader()
        const landscapeW = currentPageW()
        const landscapeContentW = landscapeW - 24
        autoTable(doc, {
          startY: 36,
          margin: { top: 36, left: 12, right: 12, bottom: 18 },
          head: [['Prioridade', 'O que', 'Por quê', 'Onde', 'Quem', 'Quando', 'Como', 'Quanto']],
          body: comparativo.planoAcao.map(acao => [
            acao.prioridade,
            acao.what,
            acao.why,
            acao.where,
            acao.who,
            acao.when,
            acao.how,
            acao.howMuch,
          ]),
          styles: { font: 'helvetica', fontSize: 6.6, cellPadding: 1.5, overflow: 'linebreak', valign: 'top', textColor: hexToRgb(PDF.ink), lineColor: hexToRgb(PDF.line), lineWidth: 0.08 },
          headStyles: { fillColor: hexToRgb(PDF.brandDark), textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: hexToRgb(PDF.bg) },
          columnStyles: {
            0: { cellWidth: landscapeContentW * 0.09, halign: 'center' },
            1: { cellWidth: landscapeContentW * 0.18 },
            2: { cellWidth: landscapeContentW * 0.14 },
            3: { cellWidth: landscapeContentW * 0.12 },
            4: { cellWidth: landscapeContentW * 0.12 },
            5: { cellWidth: landscapeContentW * 0.09, halign: 'center' },
            6: { cellWidth: landscapeContentW * 0.18 },
            7: { cellWidth: landscapeContentW * 0.08 },
          },
          willDrawPage: addAnexoHeader,
        })
      }

      addFooter()
      doc.save(`comparativo-nr18-${sanitizeFileName(atual.numero)}-${sanitizeFileName(obraNome)}.pdf`)
      toast.success('PDF comparativo gerado!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar PDF comparativo')
    } finally {
      setGerandoPDF(false)
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
          <button onClick={exportarPDF} disabled={gerandoPDF || !anterior} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-black text-[var(--brand)] transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand)]/10 disabled:opacity-60">
            {gerandoPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            PDF
          </button>
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
