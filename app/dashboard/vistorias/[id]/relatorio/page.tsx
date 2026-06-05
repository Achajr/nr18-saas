'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CHECKLIST, MULTA_INFO } from '@/lib/checklist-data'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, XCircle, HardHat, CloudSun, Loader2, Sparkles, Building2, ChevronDown } from 'lucide-react'

// ─── CALCULO DE MULTAS NR-28 ─────────────────────────────────────────────────
function calcularMulta(grau: string, numFuncionarios: number): number {
  const BASE: Record<string, number> = { i1: 575, i2: 2653, i3: 2655, i4: 4387 }
  let fator = 1
  if (numFuncionarios >= 11  && numFuncionarios <= 20)   fator = 1.5
  if (numFuncionarios >= 21  && numFuncionarios <= 50)   fator = 2.0
  if (numFuncionarios >= 51  && numFuncionarios <= 100)  fator = 2.5
  if (numFuncionarios >= 101 && numFuncionarios <= 500)  fator = 3.0
  if (numFuncionarios >= 501 && numFuncionarios <= 1000) fator = 4.0
  if (numFuncionarios > 1000)                            fator = 5.0
  return Math.round((BASE[grau] || BASE.i1) * fator)
}
function formatMoeda(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

// ─── GAUGE ────────────────────────────────────────────────────────────────────
function GaugeChart({ value }: { value: number }) {
  const r = 80; const cx = 100; const cy = 100
  const startAngle = -210; const endAngle = 30
  const range = endAngle - startAngle
  const angle = startAngle + (value / 100) * range
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcX = (a: number) => cx + r * Math.cos(toRad(a))
  const arcY = (a: number) => cy + r * Math.sin(toRad(a))
  const color = value >= 90 ? '#3B6D11' : value >= 70 ? '#854F0B' : value >= 50 ? '#A32D2D' : '#791F1F'
  const needleX = cx + (r - 10) * Math.cos(toRad(angle))
  const needleY = cy + (r - 10) * Math.sin(toRad(angle))
  const largeArc = (value / 100 * range) > 180 ? 1 : 0
  return (
    <svg viewBox="0 0 200 140" className="w-full max-w-[220px]">
      <path d={`M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 1 1 ${arcX(endAngle)} ${arcY(endAngle)}`} fill="none" stroke="#2a2d4a" strokeWidth="14" strokeLinecap="round" />
      {value > 0 && <path d={`M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(angle)} ${arcY(angle)}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <text x="18" y="118" fill="#888780" fontSize="9" textAnchor="middle">0%</text>
      <text x="182" y="118" fill="#888780" fontSize="9" textAnchor="middle">100%</text>
      <text x="100" y="75" fill={color} fontSize="26" fontWeight="bold" textAnchor="middle">{value}%</text>
      <text x="100" y="92" fill="#888780" fontSize="8" textAnchor="middle">indice de conformidade</text>
    </svg>
  )
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface VistoriaCompleta {
  id: string; numero: string; data_vistoria: string; clima: string; etapa_obra: string
  observacoes_gerais: string; status: string; total_itens: number; total_conformes: number
  total_nao_conformes: number; total_na: number; indice_conformidade: number; classificacao: string
  parecer_ia: string | null; parecer_editado: string | null
  obra: { id: string; name: string; num_funcionarios: number; empresa_cliente: { name: string; cnpj: string | null; cidade: string | null; uf: string | null } | null } | null
  avaliador: { full_name: string; registro_mte: string | null; crea: string | null; consultoria: { name: string; cnpj: string | null } | null } | null
}
interface ItemVistoria {
  id: string; item_id: string; bloco_id: string; status: string; observacao: string | null
  item_nr_texto: string | null; item_multa: string | null
  fotos?: { url: string; storage_path: string }[]
  empresas?: { empresa_tipo: string; empreiteira_id: string | null }[]
}
interface Empreiteira { id: string; name: string; cnpj: string; num_funcionarios: number }
interface EmpresaOpcao { id: string; label: string; cnpj: string; num_funcionarios: number; tipo: 'principal' | 'empreiteira' }

const NIVEL_CONFIG = {
  grave: { label: 'Grave', bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]', dot: '#A32D2D' },
  alto:  { label: 'Alto',  bg: 'bg-[#FAEEDA]', text: 'text-[#633806]', dot: '#854F0B' },
  medio: { label: 'Medio', bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]', dot: '#185FA5' },
  baixo: { label: 'Baixo', bg: 'bg-[#EAF3DE]', text: 'text-[#27500A]', dot: '#3B6D11' },
}
const MULTA_CONFIG = {
  i1: { bg: 'bg-[#EAF3DE]', text: 'text-[#27500A]' },
  i2: { bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]' },
  i3: { bg: 'bg-[#FAEEDA]', text: 'text-[#633806]' },
  i4: { bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]' },
}
const GRAU_CFG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  i4: { label: 'Grau I4 — Gravidade Maxima', bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]', border: 'border-[#A32D2D]/30' },
  i3: { label: 'Grau I3 — Alta Gravidade',   bg: 'bg-[#FAEEDA]', text: 'text-[#633806]', border: 'border-[#854F0B]/30' },
  i2: { label: 'Grau I2 — Gravidade Media',  bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]', border: 'border-[#185FA5]/30' },
  i1: { label: 'Grau I1 — Menor Gravidade',  bg: 'bg-[#EAF3DE]', text: 'text-[#27500A]', border: 'border-[#3B6D11]/30' },
}

export default function RelatorioPage() {
  const router = useRouter()
  const params = useParams()
  const vistoriaId = params.id as string

  const [vistoria, setVistoria] = useState<VistoriaCompleta | null>(null)
  const [todosItens, setTodosItens] = useState<ItemVistoria[]>([])
  const [empreiteiras, setEmpreiteiras] = useState<Empreiteira[]>([])
  const [empresas, setEmpresas] = useState<EmpresaOpcao[]>([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaOpcao | null>(null)
  const [blocoStats, setBlocoStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [parecer, setParecer] = useState('')
  const [parecerEditado, setParecerEditado] = useState(false)
  const [salvandoParecer, setSalvandoParecer] = useState(false)
  const [mostrarSeletorEmpresa, setMostrarSeletorEmpresa] = useState(false)

  useEffect(() => { loadRelatorio() }, [vistoriaId])

  useEffect(() => {
    if (empresaSelecionada && todosItens.length > 0) {
      calcularStats()
    }
  }, [empresaSelecionada, todosItens])

  async function loadRelatorio() {
    try {
      const { data: v } = await supabase
        .from('vistorias')
        .select('*, obra:obras(id, name, num_funcionarios, empresa_cliente:empresas_clientes(name, cnpj, cidade, uf)), avaliador:avaliadores(full_name, registro_mte, crea, consultoria:consultorias(name, cnpj))')
        .eq('id', vistoriaId).single()
      if (!v) { toast.error('Vistoria nao encontrada'); return }
      setVistoria(v as any)
      setParecer(v.parecer_editado || v.parecer_ia || '')

      // Carrega empreiteiras
      const { data: emps } = await supabase.from('obra_empreiteiras').select('*').eq('obra_id', (v as any).obra?.id).eq('ativa', true)
      const listaEmps = emps || []
      setEmpreiteiras(listaEmps)

      // Monta lista de empresas do relatório
      const empresasList: EmpresaOpcao[] = [
        {
          id: 'principal',
          label: (v as any).obra?.empresa_cliente?.name || 'Empresa principal',
          cnpj: (v as any).obra?.empresa_cliente?.cnpj || '',
          num_funcionarios: (v as any).obra?.num_funcionarios || 0,
          tipo: 'principal'
        },
        ...listaEmps.map((e: Empreiteira) => ({
          id: e.id, label: e.name, cnpj: e.cnpj,
          num_funcionarios: e.num_funcionarios, tipo: 'empreiteira' as const
        }))
      ]
      setEmpresas(empresasList)
      setEmpresaSelecionada(empresasList[0])

      // Carrega itens
      const { data: itens } = await supabase.from('vistoria_itens').select('*').eq('vistoria_id', vistoriaId)
      if (!itens) { setLoading(false); return }

      // Carrega vinculos de empresas
      const { data: vinculos } = await supabase.from('vistoria_item_empresas').select('*').eq('vistoria_id', vistoriaId)

      // Carrega fotos
      const ncsIds = itens.filter((i: any) => i.status === 'NC').map((i: any) => i.id)
      let fotosMap: Record<string, any[]> = {}
      if (ncsIds.length > 0) {
        const { data: fotos } = await supabase.from('vistoria_fotos').select('item_id, storage_path').in('item_id', ncsIds)
        if (fotos) {
          fotos.forEach((f: any) => {
            const { data: urlData } = supabase.storage.from('vistoria-fotos').getPublicUrl(f.storage_path)
            if (!fotosMap[f.item_id]) fotosMap[f.item_id] = []
            fotosMap[f.item_id].push({ url: urlData.publicUrl, storage_path: f.storage_path })
          })
        }
      }

      const itensCompletos = itens.map((it: any) => ({
        ...it,
        fotos: fotosMap[it.id] || [],
        empresas: (vinculos || []).filter((v: any) => v.item_id === it.id)
      }))
      setTodosItens(itensCompletos)

      // Gera parecer IA automaticamente se nao existir
      if (!v.parecer_ia && !v.parecer_editado) {
        await gerarParecerIA(v, itensCompletos, empresasList[0])
      }
    } catch (err) { console.error(err); toast.error('Erro ao carregar relatorio') }
    finally { setLoading(false) }
  }

  function filtrarNcsPorEmpresa(empresa: EmpresaOpcao) {
    return todosItens.filter(it => {
      if (it.status !== 'NC') return false
      if (!it.empresas || it.empresas.length === 0) return empresa.tipo === 'principal'
      return it.empresas.some((e: any) =>
        empresa.tipo === 'principal'
          ? e.empresa_tipo === 'principal'
          : e.empreiteira_id === empresa.id
      )
    })
  }

  function calcularStats() {
    if (!empresaSelecionada) return
    const stats = CHECKLIST.map(bloco => {
      const itensBloco = todosItens.filter(it => it.bloco_id === bloco.id)
      const conformes = itensBloco.filter(i => i.status === 'C').length
      const ncs = itensBloco.filter(i => i.status === 'NC').length
      const na = itensBloco.filter(i => i.status === 'NA').length
      const aplicaveis = itensBloco.length - na
      const indice = aplicaveis > 0 ? Math.round((conformes / aplicaveis) * 10000) / 100 : (itensBloco.length > 0 ? 100 : 0)
      return { bloco, conformes, ncs, na, total: itensBloco.length, indice }
    }).filter(s => s.total > 0)
    setBlocoStats(stats)
  }

  async function gerarParecerIA(v?: any, itens?: ItemVistoria[], empresa?: EmpresaOpcao) {
    const vData = v || vistoria
    const itensData = itens || todosItens
    const empData = empresa || empresaSelecionada
    if (!vData || !empData) return
    setGerandoIA(true)
    try {
      const ncsEmp = itensData.filter(it => {
        if (it.status !== 'NC') return false
        if (!it.empresas || it.empresas.length === 0) return empData.tipo === 'principal'
        return it.empresas.some((e: any) => empData.tipo === 'principal' ? e.empresa_tipo === 'principal' : e.empreiteira_id === empData.id)
      })
      const ncsList = ncsEmp.map(nc => {
        const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === nc.item_id)
        return item ? '- [' + item.nivel.toUpperCase() + '] ' + item.ref + ': ' + item.t + (nc.observacao ? ' | Obs: ' + nc.observacao : '') : ''
      }).filter(Boolean).join('\n')

      const res = await fetch('/api/ia-observacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_codigo: 'PARECER',
          item_descricao: 'Parecer tecnico conclusivo',
          secao_nome: 'Relatorio NR-18',
          empresa: empData.label,
          obra: (vData as any).obra?.name || '',
          contexto: 'Indice de conformidade: ' + vData.indice_conformidade + '%. Classificacao: ' + vData.classificacao + '. Total avaliados: ' + vData.total_itens + '. Conformes: ' + vData.total_conformes + '. Nao conformes: ' + ncsEmp.length + '. Data da vistoria: ' + vData.data_vistoria + '.\n\nNao conformidades:\n' + (ncsList || 'Nenhuma NC atribuida a esta empresa.'),
        }),
      })
      const json = await res.json()
      if (json.observacao) {
        setParecer(json.observacao)
        setParecerEditado(false)
        // Salva no banco
        await supabase.from('vistorias').update({ parecer_ia: json.observacao }).eq('id', vistoriaId)
      }
    } catch { toast.error('Erro ao gerar parecer') }
    finally { setGerandoIA(false) }
  }

  async function salvarParecer() {
    setSalvandoParecer(true)
    try {
      await supabase.from('vistorias').update({ parecer_editado: parecer }).eq('id', vistoriaId)
      toast.success('Parecer salvo!')
      setParecerEditado(false)
    } catch { toast.error('Erro ao salvar parecer') }
    finally { setSalvandoParecer(false) }
  }

  function exportarPDF() { setGerando(true); setTimeout(() => { window.print(); setGerando(false) }, 400) }

  const ncsEmpresa = empresaSelecionada ? filtrarNcsPorEmpresa(empresaSelecionada) : []
  const indice = vistoria?.indice_conformidade || 0
  const classColor = indice >= 90 ? 'text-[#3B6D11]' : indice >= 70 ? 'text-[#854F0B]' : indice >= 50 ? 'text-[#A32D2D]' : 'text-[#791F1F]'
  const classBorder = indice >= 90 ? 'border-green-500/30' : indice >= 70 ? 'border-amber-500/30' : indice >= 50 ? 'border-orange-500/30' : 'border-red-500/30'
  const classBg = indice >= 90 ? 'bg-green-900/10' : indice >= 70 ? 'bg-amber-900/10' : indice >= 50 ? 'bg-orange-900/10' : 'bg-red-900/10'
  const ncsGrave = ncsEmpresa.filter(nc => CHECKLIST.flatMap(b => b.itens).find(i => i.id === nc.item_id)?.nivel === 'grave').length
  const ncsAlto  = ncsEmpresa.filter(nc => CHECKLIST.flatMap(b => b.itens).find(i => i.id === nc.item_id)?.nivel === 'alto').length
  const ncsMedio = ncsEmpresa.filter(nc => CHECKLIST.flatMap(b => b.itens).find(i => i.id === nc.item_id)?.nivel === 'medio').length
  const numFunc  = empresaSelecionada?.num_funcionarios || 0

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" /></div>
  if (!vistoria) return null

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="min-h-screen bg-[#0f1117] pb-16">

        {/* HEADER */}
        <header className="no-print bg-[#16192a] border-b border-[#2a2d4a] px-4 py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/vistorias/' + vistoriaId)} className="p-2 text-slate-400 hover:text-white transition"><ArrowLeft size={20} /></button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-white">Relatorio Tecnico NR-18</h1>
              <p className="text-xs text-slate-500">Vistoria {vistoria.numero}</p>
            </div>
            {/* Seletor de empresa */}
            {empresas.length > 1 && (
              <div className="relative">
                <button onClick={() => setMostrarSeletorEmpresa(!mostrarSeletorEmpresa)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#185FA5]/20 border border-[#185FA5]/40 text-[#185FA5] text-xs font-medium rounded-xl transition hover:bg-[#185FA5]/30">
                  <Building2 size={13} />
                  <span className="max-w-[120px] truncate">{empresaSelecionada?.label}</span>
                  <ChevronDown size={12} />
                </button>
                {mostrarSeletorEmpresa && (
                  <div className="absolute right-0 top-full mt-1 bg-[#16192a] border border-[#2a2d4a] rounded-xl shadow-xl z-50 min-w-[220px]">
                    {empresas.map(emp => (
                      <button key={emp.id} onClick={() => { setEmpresaSelecionada(emp); setMostrarSeletorEmpresa(false); gerarParecerIA(undefined, undefined, emp) }}
                        className={'w-full px-4 py-3 text-left text-sm transition hover:bg-[#1a1d2e] ' + (empresaSelecionada?.id === emp.id ? 'text-[#185FA5] font-medium' : 'text-slate-300')}>
                        <div className="font-medium truncate">{emp.label}</div>
                        <div className="text-xs text-slate-500">{emp.cnpj} · {emp.num_funcionarios} func.</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={exportarPDF} disabled={gerando} className="flex items-center gap-2 px-4 py-2 bg-[#185FA5] hover:bg-[#1a6bbf] text-white text-sm font-medium rounded-xl transition">
              {gerando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} PDF
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

          {/* 1. CABECALHO */}
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1"><HardHat size={16} className="text-[#185FA5]" /><span className="text-xs text-slate-500 uppercase tracking-wider">Relatorio Tecnico de Vistoria</span></div>
                <h2 className="text-2xl font-bold text-white">NR-18 — Seguranca na Construcao Civil</h2>
                <p className="text-sm text-slate-400 mt-1">Portaria MTE n. 836, de 13 de maio de 2026</p>
                {empresas.length > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Relatorio para:</span>
                    <span className="text-xs font-semibold text-[#185FA5] bg-[#185FA5]/10 px-2 py-0.5 rounded-full">{empresaSelecionada?.label}</span>
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-bold text-[#185FA5]">#{vistoria.numero}</div>
                <div className="text-xs text-slate-500 mt-1">{new Date(vistoria.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f1117] rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Empresa</div>
                <div className="text-sm font-bold text-white">{empresaSelecionada?.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{empresaSelecionada?.cnpj}</div>
                {empresaSelecionada?.num_funcionarios ? <div className="text-xs text-slate-500">{empresaSelecionada.num_funcionarios} funcionarios na obra</div> : null}
              </div>
              <div className="bg-[#0f1117] rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Obra</div>
                <div className="text-sm font-bold text-white">{vistoria.obra?.name || '—'}</div>
                {vistoria.etapa_obra && <div className="text-xs text-slate-400 mt-0.5">{vistoria.etapa_obra}</div>}
              </div>
              <div className="bg-[#0f1117] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1"><CloudSun size={12} className="text-slate-500" /><span className="text-xs text-slate-500">Condicoes climaticas</span></div>
                <div className="text-sm text-white">{vistoria.clima || '—'}</div>
              </div>
              <div className="bg-[#0f1117] rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Responsavel tecnico</div>
                <div className="text-sm font-bold text-white">{vistoria.avaliador?.full_name || '—'}</div>
                <div className="text-xs text-slate-400 mt-0.5">{vistoria.avaliador?.crea ? 'CREA ' + vistoria.avaliador.crea : vistoria.avaliador?.registro_mte ? 'MTE ' + vistoria.avaliador.registro_mte : ''}</div>
                <div className="text-xs text-slate-500">{vistoria.avaliador?.consultoria?.name}</div>
              </div>
            </div>
            {vistoria.observacoes_gerais && <div className="mt-3 bg-[#0f1117] rounded-xl p-3"><div className="text-xs text-slate-500 mb-1">Observacoes gerais</div><p className="text-sm text-slate-300">{vistoria.observacoes_gerais}</p></div>}
          </div>

          {/* 2. INDICE */}
          <div className={'rounded-2xl border p-6 ' + classBorder + ' ' + classBg}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-56"><GaugeChart value={indice} /></div>
              <div className="flex-1 w-full">
                <div className={'text-2xl font-bold mb-0.5 ' + classColor}>{vistoria.classificacao}</div>
                <div className="text-xs text-slate-500 mb-4">Classificacao da vistoria NR-18</div>
                <div className="grid grid-cols-4 gap-2 text-center mb-4">
                  {[
                    { label: 'Avaliados', val: vistoria.total_itens, color: 'text-white' },
                    { label: 'Conformes', val: vistoria.total_conformes, color: 'text-[#3B6D11]' },
                    { label: 'Nao conformes', val: vistoria.total_nao_conformes, color: 'text-[#A32D2D]' },
                    { label: 'Nao aplica', val: vistoria.total_na, color: 'text-slate-400' },
                  ].map((c, i) => (
                    <div key={i} className="bg-[#0f1117]/60 rounded-xl py-3">
                      <div className={'text-2xl font-bold ' + c.color}>{c.val}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-tight">{c.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0f1117]/60 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-2">Escala de classificacao NR-18</div>
                  <div className="grid grid-cols-4 gap-1 text-xs text-center">
                    {[
                      { label: 'Satisfatorio', range: '>=90%', bg: 'bg-[#EAF3DE]', text: 'text-[#27500A]', match: indice >= 90 },
                      { label: 'Parc. satisf.', range: '70-89%', bg: 'bg-[#FAEEDA]', text: 'text-[#633806]', match: indice >= 70 && indice < 90 },
                      { label: 'Insatisfatorio', range: '50-69%', bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]', match: indice >= 50 && indice < 70 },
                      { label: 'Critico', range: '<50%', bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]', match: indice < 50 },
                    ].map((s, i) => (
                      <div key={i} className={'rounded-lg py-1.5 px-1 ' + s.bg + ' ' + s.text + (s.match ? ' ring-2 ring-current' : '')}>
                        <div className="font-bold text-xs">{s.label}</div>
                        <div className="text-xs opacity-70">{s.range}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. NCs POR NIVEL */}
          {ncsEmpresa.length > 0 && (
            <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Distribuicao das Nao Conformidades — {empresaSelecionada?.label}</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Grave', count: ncsGrave, bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]', desc: 'Acao imediata' },
                  { label: 'Alto',  count: ncsAlto,  bg: 'bg-[#FAEEDA]', text: 'text-[#633806]', desc: 'Curto prazo' },
                  { label: 'Medio', count: ncsMedio, bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]', desc: 'Programado' },
                ].map((n, i) => (
                  <div key={i} className={'rounded-xl p-3 text-center ' + n.bg}>
                    <div className={'text-3xl font-bold ' + n.text}>{n.count}</div>
                    <div className={'text-xs font-semibold mt-0.5 ' + n.text}>{n.label}</div>
                    <div className={'text-xs mt-0.5 opacity-70 ' + n.text}>{n.desc}</div>
                  </div>
                ))}
              </div>
              {ncsEmpresa.length > 0 && (
                <div className="h-3 rounded-full overflow-hidden flex">
                  {ncsGrave > 0 && <div className="bg-[#A32D2D]" style={{ width: (ncsGrave/ncsEmpresa.length*100) + '%' }} />}
                  {ncsAlto  > 0 && <div className="bg-[#854F0B]" style={{ width: (ncsAlto/ncsEmpresa.length*100)  + '%' }} />}
                  {ncsMedio > 0 && <div className="bg-[#185FA5]" style={{ width: (ncsMedio/ncsEmpresa.length*100) + '%' }} />}
                </div>
              )}
            </div>
          )}

          {/* 4. CONFORMIDADE POR BLOCO */}
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Conformidade por Secao da NR-18</h3>
            {blocoStats.map((s: any) => {
              const color = s.indice >= 90 ? '#3B6D11' : s.indice >= 70 ? '#854F0B' : s.indice >= 50 ? '#A32D2D' : '#791F1F'
              const titulo = s.bloco.titulo.split('—').slice(1).join('—').trim() || s.bloco.titulo
              return (
                <div key={s.bloco.id} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-[#185FA5] flex-shrink-0">{s.bloco.ref}</span>
                      <span className="text-xs text-slate-300 truncate">{titulo}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {s.ncs > 0 && <span className="text-xs text-[#A32D2D] bg-[#FCEBEB] px-1.5 py-0.5 rounded font-medium">{s.ncs} NC</span>}
                      <span className="text-xs font-bold" style={{ color }}>{s.indice}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#2a2d4a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: s.indice + '%', backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 5. PARECER IA */}
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Parecer Tecnico Conclusivo</h3>
                <p className="text-xs text-slate-500 mt-0.5">Editavel — clique no texto para modificar</p>
              </div>
              <div className="flex items-center gap-2">
                {parecerEditado && (
                  <button onClick={salvarParecer} disabled={salvandoParecer}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-500/30 text-green-400 text-xs font-medium rounded-xl transition hover:bg-green-900/50">
                    {salvandoParecer ? <Loader2 size={12} className="animate-spin" /> : null} Salvar
                  </button>
                )}
                <button onClick={() => gerarParecerIA()} disabled={gerandoIA}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#185FA5]/20 hover:bg-[#185FA5]/30 border border-[#185FA5]/40 text-[#185FA5] text-xs font-medium rounded-xl transition">
                  {gerandoIA ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {gerandoIA ? 'Gerando...' : 'Reescrever com IA'}
                </button>
              </div>
            </div>
            {gerandoIA && !parecer ? (
              <div className="bg-[#0f1117] rounded-xl p-6 text-center">
                <Loader2 size={24} className="animate-spin text-[#185FA5] mx-auto mb-2" />
                <p className="text-xs text-slate-500">Gerando parecer tecnico com IA...</p>
              </div>
            ) : (
              <textarea
                value={parecer}
                onChange={e => { setParecer(e.target.value); setParecerEditado(true) }}
                rows={8}
                className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] focus:border-[#185FA5]/50 rounded-xl text-sm text-slate-300 leading-relaxed focus:outline-none transition resize-none"
                placeholder="Parecer tecnico sera gerado automaticamente..."
              />
            )}
          </div>

          {/* 6. NCs DETALHADAS */}
          {ncsEmpresa.length > 0 && (
            <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2a2d4a] flex items-center gap-2">
                <XCircle size={16} className="text-[#A32D2D]" />
                <h3 className="font-semibold text-white text-sm">Nao Conformidades — {empresaSelecionada?.label} ({ncsEmpresa.length})</h3>
              </div>
              <div className="divide-y divide-[#2a2d4a]">
                {ncsEmpresa.map((nc, idx) => {
                  const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === nc.item_id)
                  const bloco = CHECKLIST.find(b => b.itens.some(i => i.id === nc.item_id))
                  if (!item) return null
                  const nivelCfg = NIVEL_CONFIG[item.nivel as keyof typeof NIVEL_CONFIG]
                  const multaCfg = MULTA_CONFIG[item.multa as keyof typeof MULTA_CONFIG] || MULTA_CONFIG.i1
                  return (
                    <div key={nc.id} className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FCEBEB] border border-[#A32D2D]/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#A32D2D]">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + nivelCfg.bg + ' ' + nivelCfg.text}>{nivelCfg.label}</span>
                            <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + multaCfg.bg + ' ' + multaCfg.text}>{MULTA_INFO[item.multa as keyof typeof MULTA_INFO]?.label} — {MULTA_INFO[item.multa as keyof typeof MULTA_INFO]?.faixa}</span>
                            <span className="text-xs font-mono text-[#185FA5]">{item.ref}</span>
                          </div>
                          <p className="text-sm font-medium text-white mb-2">{item.t}</p>
                          <div className="bg-[#0f1117] rounded-xl p-3 mb-2 border-l-2 border-[#185FA5]/40">
                            <div className="text-xs text-[#185FA5] mb-1 font-medium">Texto legal — {item.ref}</div>
                            <p className="text-xs text-slate-400 leading-relaxed">{item.nr}</p>
                          </div>
                          <div className={'rounded-xl p-2 mb-2 ' + multaCfg.bg}>
                            <p className={'text-xs ' + multaCfg.text}><strong>Penalidade NR-28:</strong> {MULTA_INFO[item.multa as keyof typeof MULTA_INFO]?.desc}</p>
                          </div>
                          {nc.observacao && (
                            <div className="bg-[#16192a] border border-[#2a2d4a] rounded-xl p-3 mb-2">
                              <div className="text-xs text-slate-500 mb-1">Observacao do tecnico</div>
                              <p className="text-sm text-slate-300 italic">"{nc.observacao}"</p>
                            </div>
                          )}
                          {nc.fotos && nc.fotos.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2">
                              {nc.fotos.map((f: any, fi: number) => (
                                <div key={fi} className="w-28 h-28 rounded-xl overflow-hidden border border-[#2a2d4a]">
                                  <img src={f.url} alt={'Foto ' + (idx+1) + '.' + (fi+1)} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 7. MULTAS */}
          {ncsEmpresa.length > 0 && (() => {
            const itensMulta = ncsEmpresa.map(nc => {
              const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === nc.item_id)
              if (!item) return null
              const valor = calcularMulta(item.multa, numFunc)
              return { nc, item, valor }
            }).filter(Boolean) as any[]
            const totalGeral = itensMulta.reduce((s: number, i: any) => s + i.valor, 0)
            const porGrau = ['i4','i3','i2','i1'].map(grau => ({
              grau, itens: itensMulta.filter((i: any) => i.item.multa === grau),
              subtotal: itensMulta.filter((i: any) => i.item.multa === grau).reduce((s: number, i: any) => s + i.valor, 0),
            })).filter(g => g.itens.length > 0)
            return (
              <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#2a2d4a]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-sm">Relatorio de Autuacoes e Multas — NR-28</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{empresaSelecionada?.label} · {numFunc > 0 ? numFunc + ' funcionarios' : 'funcionarios nao informados'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total estimado</div>
                      <div className="text-xl font-bold text-[#A32D2D]">{formatMoeda(totalGeral)}</div>
                    </div>
                  </div>
                  {numFunc === 0 && <div className="mt-2 bg-amber-900/20 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400">⚠ Numero de funcionarios nao informado — usando fator base. Cadastre o numero de funcionarios para calculo preciso.</div>}
                </div>
                <div className="p-5 space-y-5">
                  {porGrau.map(({ grau, itens, subtotal }) => {
                    const cfg = GRAU_CFG[grau]
                    return (
                      <div key={grau}>
                        <div className={'flex items-center justify-between px-3 py-2 rounded-xl mb-2 ' + cfg.bg}>
                          <span className={'text-xs font-bold ' + cfg.text}>{cfg.label}</span>
                          <span className={'text-sm font-bold ' + cfg.text}>{formatMoeda(subtotal)}</span>
                        </div>
                        <div className="space-y-2">
                          {itens.map((it: any) => {
                            const bloco = CHECKLIST.find(b => b.itens.some(i => i.id === it.nc.item_id))
                            const fatorLabel = numFunc <= 10 ? '1.0' : numFunc <= 20 ? '1.5' : numFunc <= 50 ? '2.0' : numFunc <= 100 ? '2.5' : numFunc <= 500 ? '3.0' : numFunc <= 1000 ? '4.0' : '5.0'
                            return (
                              <div key={it.nc.id} className={'border rounded-xl p-3 ' + cfg.border + ' bg-[#0f1117]'}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={'text-xs font-mono ' + cfg.text}>{it.item.ref}</span>
                                      <span className="text-xs text-slate-500">{bloco?.titulo.split('—').slice(1).join('—').trim()}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed mb-1">{it.item.t}</p>
                                    {it.nc.observacao && <p className="text-xs text-slate-500 italic">"{it.nc.observacao}"</p>}
                                    <div className="mt-1.5 text-xs text-slate-600">{MULTA_INFO[it.item.multa as keyof typeof MULTA_INFO]?.desc}</div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className={'text-base font-bold ' + cfg.text}>{formatMoeda(it.valor)}</div>
                                    <div className="text-xs text-slate-600">por infracao</div>
                                    {numFunc > 0 && <div className="text-xs text-slate-600 mt-0.5">fator x{fatorLabel}</div>}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  <div className="border-t border-[#2a2d4a] pt-4">
                    <div className="bg-[#0f1117] rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resumo das Penalidades</div>
                      <div className="space-y-1.5 mb-3">
                        {porGrau.map(({ grau, itens, subtotal }) => (
                          <div key={grau} className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">{itens.length}x {GRAU_CFG[grau].label.split('—')[0].trim()}</span>
                            <span className="font-medium text-white">{formatMoeda(subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#2a2d4a] pt-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">TOTAL ESTIMADO DE MULTAS</div>
                          <div className="text-xs text-slate-500 mt-0.5">Em caso de reincidencia, valores I4 dobram (CLT art. 201)</div>
                        </div>
                        <div className="text-2xl font-bold text-[#A32D2D]">{formatMoeda(totalGeral)}</div>
                      </div>
                      <div className="mt-3 text-xs text-slate-600 leading-relaxed">* Valores calculados com base na tabela NR-28 / CLT art. 201, considerando {numFunc > 0 ? numFunc + ' funcionarios' : 'fator base'}. Sujeitos a atualizacao pelo MTE. Estimativa de referencia para fins de orientacao tecnica.</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 8. ASSINATURA */}
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-6">Assinatura e Responsabilidade Tecnica</h3>
            <div className="flex flex-col items-center gap-2">
              <div className="w-72 border-b-2 border-slate-500 mb-2" />
              <div className="text-base font-bold text-white">{vistoria.avaliador?.full_name}</div>
              <div className="text-sm text-slate-400">{vistoria.avaliador?.crea ? 'CREA ' + vistoria.avaliador.crea : vistoria.avaliador?.registro_mte ? 'Registro MTE n. ' + vistoria.avaliador.registro_mte : 'Tecnico de Seguranca do Trabalho'}</div>
              <div className="text-sm text-slate-400">{vistoria.avaliador?.consultoria?.name}</div>
              <div className="text-xs text-slate-600 mt-3">Emitido em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              <div className="text-xs text-slate-600 mt-1">Documento gerado pelo sistema NR18 SaaS — Portaria MTE n. 836/2026</div>
            </div>
          </div>

        </main>
      </div>
    </>
  )
}
