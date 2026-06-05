'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CHECKLIST, MULTA_INFO, type ChecklistItem } from '@/lib/checklist-data'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Camera, Trash2, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, Sparkles, FileText, Save,
  AlertTriangle, Info, X, Plus, Building2
} from 'lucide-react'

type Resposta = 'C' | 'NC' | 'NA' | ''

interface Empreiteira {
  id: string
  name: string
  cnpj: string
  num_funcionarios: number
}

interface EmpresaChip {
  id: string // 'principal' ou uuid da empreiteira
  label: string
  abrev: string
  color: string
}

interface ItemState {
  bloco_id: string
  item_id: string
  resposta: Resposta
  observacao: string
  db_id?: string
  gerando_ia?: boolean
  empresas_selecionadas: string[] // ['principal'] ou ['principal', uuid, ...]
}

interface VistoriaInfo {
  id: string
  numero: string
  data_vistoria: string
  status: string
  obra_id: string
  obra: {
    id: string
    name: string
    empresa_cliente_id: string
    empresa_cliente: { name: string; cnpj: string | null } | null
  } | null
}

const NIVEL_CONFIG = {
  grave: { label: 'Grave', bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]' },
  alto:  { label: 'Alto',  bg: 'bg-[#FAEEDA]', text: 'text-[#633806]' },
  medio: { label: 'Médio', bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]' },
  baixo: { label: 'Baixo', bg: 'bg-[#EAF3DE]', text: 'text-[#27500A]' },
}

const MULTA_CONFIG = {
  i1: { bg: 'bg-[#EAF3DE]', text: 'text-[#27500A]' },
  i2: { bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]' },
  i3: { bg: 'bg-[#FAEEDA]', text: 'text-[#633806]' },
  i4: { bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]' },
}

// Cores dos chips por posicao
const CHIP_COLORS = [
  'bg-[#185FA5] text-white',
  'bg-[#3B6D11] text-white',
  'bg-[#854F0B] text-white',
  'bg-[#6B21A8] text-white',
  'bg-[#0E7490] text-white',
  'bg-[#9D174D] text-white',
]

function abreviar(nome: string): string {
  const palavras = nome.trim().split(/\s+/)
  if (palavras.length === 1) return nome.slice(0, 6).toUpperCase()
  return palavras.slice(0, 2).map(p => p.slice(0, 3)).join(' ').toUpperCase()
}

export default function ChecklistPage() {
  const router = useRouter()
  const params = useParams()
  const vistoriaId = params.id as string

  const [vistoria, setVistoria] = useState<VistoriaInfo | null>(null)
  const [itens, setItens] = useState<Record<string, ItemState>>({})
  const [fotos, setFotos] = useState<Record<string, { url: string; storage_path?: string; db_id?: string }[]>>({})
  const [empreiteiras, setEmpreiteiras] = useState<Empreiteira[]>([])
  const [chips, setChips] = useState<EmpresaChip[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({ pgr: true })
  const [modalNr, setModalNr] = useState<ChecklistItem | null>(null)
  const [modalEmpreiteira, setModalEmpreiteira] = useState(false)
  const [novaEmp, setNovaEmp] = useState({ name: '', cnpj: '', num_funcionarios: '' })
  const [salvandoEmp, setSalvandoEmp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fotoItemAlvo, setFotoItemAlvo] = useState<string | null>(null)
  const [consultoriaId, setConsultoriaId] = useState('')

  useEffect(() => { init() }, [vistoriaId])

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: av } = await supabase.from('avaliadores').select('consultoria_id').eq('id', user.id).single()
      if (av) setConsultoriaId(av.consultoria_id)

      const { data: v } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, status, obra_id, obra:obras(id, name, empresa_cliente_id, empresa_cliente:empresas_clientes(name, cnpj))')
        .eq('id', vistoriaId).single()
      if (!v) { toast.error('Vistoria não encontrada'); router.push('/dashboard'); return }
      setVistoria(v as any)
      setSecoesAbertas({ [CHECKLIST[0].id]: true })

      // Carrega empreiteiras da obra
      await carregarEmpreiteiras((v as any).obra_id, (v as any).obra?.empresa_cliente?.name || 'Empresa')

      // Estado inicial dos itens
      const estado: Record<string, ItemState> = {}
      CHECKLIST.forEach(bloco => {
        bloco.itens.forEach(item => {
          estado[item.id] = { bloco_id: bloco.id, item_id: item.id, resposta: '', observacao: '', empresas_selecionadas: ['principal'] }
        })
      })

      // Carrega respostas salvas
      const { data: saved } = await supabase.from('vistoria_itens').select('*').eq('vistoria_id', vistoriaId)
      if (saved && saved.length > 0) {
        // Carrega vinculos de empresas por item
        const itemIds = saved.map((s: any) => s.id)
        const { data: vinculos } = await supabase
          .from('vistoria_item_empresas')
          .select('item_id, empresa_tipo, empreiteira_id')
          .in('item_id', itemIds)

        saved.forEach((s: any) => {
          if (estado[s.item_id]) {
            estado[s.item_id].resposta = s.status || ''
            estado[s.item_id].observacao = s.observacao || ''
            estado[s.item_id].db_id = s.id
            // Restaura empresas selecionadas
            const emps = (vinculos || []).filter((v: any) => v.item_id === s.id)
            if (emps.length > 0) {
              estado[s.item_id].empresas_selecionadas = emps.map((e: any) =>
                e.empresa_tipo === 'principal' ? 'principal' : e.empreiteira_id
              )
            }
          }
        })
      }
      setItens(estado)

      // Carrega fotos
      const { data: savedFotos } = await supabase.from('vistoria_fotos').select('id, storage_path, item_id').eq('vistoria_id', vistoriaId)
      if (savedFotos && savedFotos.length > 0) {
        const fm: Record<string, any[]> = {}
        savedFotos.forEach((f: any) => {
          const { data: urlData } = supabase.storage.from('vistoria-fotos').getPublicUrl(f.storage_path)
          if (!fm[f.item_id]) fm[f.item_id] = []
          fm[f.item_id].push({ url: urlData.publicUrl, storage_path: f.storage_path, db_id: f.id })
        })
        setFotos(fm)
      }
    } catch (err) { console.error(err); toast.error('Erro ao carregar checklist') }
    finally { setLoading(false) }
  }

  async function carregarEmpreiteiras(obraId: string, empresaNome: string) {
    const { data } = await supabase.from('obra_empreiteiras').select('*').eq('obra_id', obraId).eq('ativa', true).order('created_at')
    const lista = data || []
    setEmpreiteiras(lista)

    const chipsArr: EmpresaChip[] = [
      { id: 'principal', label: empresaNome, abrev: abreviar(empresaNome), color: CHIP_COLORS[0] },
      ...lista.map((e: Empreiteira, i: number) => ({
        id: e.id, label: e.name, abrev: abreviar(e.name), color: CHIP_COLORS[(i + 1) % CHIP_COLORS.length]
      }))
    ]
    setChips(chipsArr)
  }

  async function adicionarEmpreiteira() {
    if (!novaEmp.name.trim() || !novaEmp.cnpj.trim()) { toast.error('Nome e CNPJ obrigatórios'); return }
    if (!vistoria?.obra_id) return
    setSalvandoEmp(true)
    try {
      const { data, error } = await supabase.from('obra_empreiteiras').insert({
        obra_id: vistoria.obra_id,
        consultoria_id: consultoriaId,
        name: novaEmp.name.trim(),
        cnpj: novaEmp.cnpj.trim(),
        num_funcionarios: parseInt(novaEmp.num_funcionarios) || 0,
      }).select().single()
      if (error) throw error
      toast.success('Empreiteira adicionada!')
      setNovaEmp({ name: '', cnpj: '', num_funcionarios: '' })
      setModalEmpreiteira(false)
      await carregarEmpreiteiras(vistoria.obra_id, vistoria.obra?.empresa_cliente?.name || 'Empresa')
    } catch (err: any) { toast.error(err.message || 'Erro ao adicionar empreiteira') }
    finally { setSalvandoEmp(false) }
  }

  function toggleEmpresa(item_id: string, empresa_id: string) {
    setItens(prev => {
      const it = prev[item_id]
      let emps = [...it.empresas_selecionadas]
      if (emps.includes(empresa_id)) {
        // Nao permite desmarcar se for a unica
        if (emps.length === 1) return prev
        emps = emps.filter(e => e !== empresa_id)
      } else {
        emps.push(empresa_id)
      }
      return { ...prev, [item_id]: { ...it, empresas_selecionadas: emps } }
    })
  }

  function setResposta(item_id: string, resposta: Resposta) {
    setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], resposta } }))
  }

  function setObservacao(item_id: string, obs: string) {
    setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], observacao: obs } }))
  }

  function toggleSecao(id: string) {
    setSecoesAbertas(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function salvarItens(statusVistoria: string, silent = false) {
    setSaving(true)
    try {
      const respondidos = Object.values(itens).filter(i => i.resposta !== '')
      if (respondidos.length === 0) {
        if (!silent) toast.error('Responda pelo menos um item')
        setSaving(false)
        return false
      }
      for (const it of respondidos) {
        const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === it.item_id)
        const bloco = CHECKLIST.find(b => b.itens.some(i => i.id === it.item_id))
        if (!item) continue

        let dbId = it.db_id
        if (dbId) {
          await supabase.from('vistoria_itens').update({ status: it.resposta, observacao: it.observacao || null }).eq('id', dbId)
        } else {
          const { data } = await supabase.from('vistoria_itens').insert({
            vistoria_id: vistoriaId,
            item_id: it.item_id,
            bloco_id: it.bloco_id,
            bloco_titulo: bloco?.titulo || '',
            item_texto: item.t,
            item_ref: item.ref,
            item_nivel: item.nivel,
            item_perigo: item.perigo,
            item_multa: item.multa,
            item_nr_texto: item.nr,
            status: it.resposta,
            observacao: it.observacao || null,
          }).select('id').single()
          if (data) {
            dbId = data.id
            setItens(prev => ({ ...prev, [it.item_id]: { ...prev[it.item_id], db_id: data.id } }))
          }
        }

        // Salva vinculos de empresas para NCs
        if (dbId && it.resposta === 'NC') {
          await supabase.from('vistoria_item_empresas').delete().eq('item_id', dbId)
          for (const empId of it.empresas_selecionadas) {
            await supabase.from('vistoria_item_empresas').insert({
              vistoria_id: vistoriaId,
              item_id: dbId,
              empresa_tipo: empId === 'principal' ? 'principal' : 'empreiteira',
              empreiteira_id: empId === 'principal' ? null : empId,
            })
          }
        }
      }

      // Atualiza status da vistoria
      await supabase.from('vistorias').update({ status: statusVistoria }).eq('id', vistoriaId)
      if (!silent) toast.success(statusVistoria === 'incompleta' ? 'Progresso salvo! Vistoria marcada como incompleta.' : 'Salvo!')
      return true
    } catch (err: any) {
      if (!silent) toast.error(err.message || 'Erro ao salvar')
      return false
    } finally { setSaving(false) }
  }

  async function salvarParcialmente() {
    await salvarItens('incompleta', false)
  }

  async function concluirVistoria() {
    const respondidos = Object.values(itens).filter(i => i.resposta !== '')
    if (respondidos.length === 0) { toast.error('Responda pelo menos um item'); return }
    const conformes = respondidos.filter(i => i.resposta === 'C').length
    const ncs = respondidos.filter(i => i.resposta === 'NC').length
    const na = respondidos.filter(i => i.resposta === 'NA').length
    const aplicaveis = respondidos.length - na
    const indice = aplicaveis > 0 ? Math.round((conformes / aplicaveis) * 10000) / 100 : 100
    let classificacao = 'Critico'
    if (indice >= 90) classificacao = 'Satisfatorio'
    else if (indice >= 70) classificacao = 'Parcialmente satisfatorio'
    else if (indice >= 50) classificacao = 'Insatisfatorio'
    setConcluindo(true)
    try {
      const ok = await salvarItens('concluida', true)
      if (!ok) { setConcluindo(false); return }
      const { error } = await supabase.from('vistorias').update({
        status: 'concluida',
        total_itens: respondidos.length,
        total_conformes: conformes,
        total_nao_conformes: ncs,
        total_na: na,
        indice_conformidade: indice,
        classificacao,
      }).eq('id', vistoriaId)
      if (error) throw error
      toast.success('Vistoria concluída! Índice: ' + indice + '%')
      router.push('/dashboard/vistorias/' + vistoriaId + '/relatorio')
    } catch (err: any) { toast.error(err.message || 'Erro ao concluir') }
    finally { setConcluindo(false) }
  }

  function abrirCamera(item_id: string) { setFotoItemAlvo(item_id); fileInputRef.current?.click() }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !fotoItemAlvo) return
    const item_id = fotoItemAlvo
    const it = itens[item_id]
    let db_item_id = it?.db_id
    if (!db_item_id) {
      const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === item_id)
      const bloco = CHECKLIST.find(b => b.itens.some(i => i.id === item_id))
      if (!item) return
      const { data } = await supabase.from('vistoria_itens').insert({
        vistoria_id: vistoriaId, item_id, bloco_id: it.bloco_id,
        bloco_titulo: bloco?.titulo || '', item_texto: item.t, item_ref: item.ref,
        item_nivel: item.nivel, item_perigo: item.perigo, item_multa: item.multa,
        item_nr_texto: item.nr, status: it.resposta || 'NC', observacao: it.observacao || null,
      }).select('id').single()
      if (data) { db_item_id = data.id; setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], db_id: data.id, resposta: prev[item_id].resposta || 'NC' } })) }
    }
    for (const file of Array.from(files)) {
      const tempUrl = URL.createObjectURL(file)
      setFotos(prev => ({ ...prev, [item_id]: [...(prev[item_id] || []), { url: tempUrl } as any] }))
      try {
        const ext = file.name.split('.').pop()
        const path = `vistorias/${vistoriaId}/${item_id}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('vistoria-fotos').upload(path, file, { contentType: file.type })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('vistoria-fotos').getPublicUrl(path)
        const { data: fotoData } = await supabase.from('vistoria_fotos').insert({
          vistoria_id: vistoriaId, item_id: db_item_id, storage_path: path, tipo: 'nc'
        }).select('id').single()
        setFotos(prev => {
          const arr = [...(prev[item_id] || [])]
          const idx = arr.findIndex(f => f.url === tempUrl)
          if (idx !== -1) arr[idx] = { url: urlData.publicUrl, storage_path: path, db_id: fotoData?.id }
          return { ...prev, [item_id]: arr }
        })
      } catch { toast.error('Erro ao enviar foto'); setFotos(prev => ({ ...prev, [item_id]: (prev[item_id] || []).filter(f => f.url !== tempUrl) })) }
    }
    e.target.value = ''; setFotoItemAlvo(null)
  }

  async function removerFoto(item_id: string, url: string, db_id?: string, storage_path?: string) {
    if (db_id) await supabase.from('vistoria_fotos').delete().eq('id', db_id)
    if (storage_path) await supabase.storage.from('vistoria-fotos').remove([storage_path])
    setFotos(prev => ({ ...prev, [item_id]: (prev[item_id] || []).filter(f => f.url !== url) }))
  }

  async function gerarObservacaoIA(item_id: string) {
    const it = itens[item_id]
    if (!it || it.resposta !== 'NC') { toast.error('Selecione NC antes de usar a IA'); return }
    if (!it.observacao || it.observacao.trim().length < 10) { toast.error('Escreva a observação primeiro (mín. 10 caracteres)'); return }
    setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], gerando_ia: true } }))
    try {
      const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === item_id)
      const bloco = CHECKLIST.find(b => b.itens.some(i => i.id === item_id))
      const res = await fetch('/api/ia-observacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_codigo: item?.ref, item_descricao: item?.t, secao_nome: bloco?.titulo,
          empresa: vistoria?.obra?.empresa_cliente?.name || 'empresa',
          obra: vistoria?.obra?.name || 'obra',
          texto_avaliador: it.observacao,
        }),
      })
      const json = await res.json()
      if (json.observacao) { setObservacao(item_id, json.observacao); toast.success('Reescrito com IA!') }
    } catch { toast.error('Erro ao chamar IA') }
    finally { setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], gerando_ia: false } })) }
  }

  const todosItens = Object.values(itens)
  const totalItens = todosItens.length
  const respondidos = todosItens.filter(i => i.resposta !== '').length
  const conformes = todosItens.filter(i => i.resposta === 'C').length
  const naoConformes = todosItens.filter(i => i.resposta === 'NC').length
  const progresso = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0
  const statusAtual = vistoria?.status

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#0f1117] pb-32">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFotoChange} />

      {/* Modal texto NR */}
      {modalNr && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d4a] sticky top-0 bg-[#16192a]">
              <div><span className="text-xs font-mono text-[#185FA5]">{modalNr.ref}</span><h3 className="text-sm font-semibold text-white mt-0.5">Texto legal NR-18</h3></div>
              <button onClick={() => setModalNr(null)} className="p-2 text-slate-500 hover:text-white transition"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + NIVEL_CONFIG[modalNr.nivel].bg + ' ' + NIVEL_CONFIG[modalNr.nivel].text}>⚠ {NIVEL_CONFIG[modalNr.nivel].label}</span>
                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + MULTA_CONFIG[modalNr.multa].bg + ' ' + MULTA_CONFIG[modalNr.multa].text}>{MULTA_INFO[modalNr.multa].label} — {MULTA_INFO[modalNr.multa].faixa}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[#2a2d4a] text-slate-400">{modalNr.perigo}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{modalNr.nr}</p>
              <p className="text-xs text-slate-500 italic">{MULTA_INFO[modalNr.multa].desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Empreiteira */}
      {modalEmpreiteira && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d4a]">
              <div>
                <h3 className="text-sm font-semibold text-white">Adicionar Empreiteira</h3>
                <p className="text-xs text-slate-500 mt-0.5">Digite o CNPJ para buscar automaticamente</p>
              </div>
              <button onClick={() => setModalEmpreiteira(false)} className="p-2 text-slate-500 hover:text-white transition"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="relative">
                <input type="text" value={novaEmp.cnpj}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 14)
                    const fmt = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                      .replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4')
                      .replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')
                      .replace(/(\d{2})(\d{3})/, '$1.$2')
                    setNovaEmp(p => ({ ...p, cnpj: fmt }))
                    const digits = val.replace(/\D/g, '')
                    if (digits.length === 14) {
                      setNovaEmp(p => ({ ...p, name: 'Buscando...' }))
                      fetch('https://brasilapi.com.br/api/cnpj/v1/' + digits)
                        .then(r => r.json())
                        .then(d => {
                          if (d.razao_social) {
                            setNovaEmp(p => ({ ...p, name: d.razao_social, cnpj: fmt }))
                            toast.success('Empresa encontrada!')
                          }
                        })
                        .catch(() => setNovaEmp(p => ({ ...p, name: '' })))
                    }
                  }}
                  placeholder="CNPJ (busca automática)"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition" />
              </div>
              <input type="text" value={novaEmp.name} onChange={e => setNovaEmp(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome da empreiteira"
                className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition" />
              <input type="number" value={novaEmp.num_funcionarios} onChange={e => setNovaEmp(p => ({ ...p, num_funcionarios: e.target.value }))}
                placeholder="Nº de funcionários na obra" min="1"
                className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModalEmpreiteira(false)} className="flex-1 py-3 border border-[#2a2d4a] text-slate-400 rounded-xl text-sm transition hover:text-white">Cancelar</button>
                <button onClick={adicionarEmpreiteira} disabled={salvandoEmp}
                  className="flex-1 py-3 bg-[#185FA5] hover:bg-[#1a6bbf] text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30">
                  {salvandoEmp ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#16192a] border-b border-[#2a2d4a] px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 text-slate-400 hover:text-white transition"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">Checklist NR-18 — {vistoria?.obra?.empresa_cliente?.name || vistoria?.obra?.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500">Vistoria {vistoria?.numero}</p>
              {statusAtual === 'incompleta' && <span className="text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full">Incompleta</span>}
              {statusAtual === 'concluida' && <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full">Concluída</span>}
            </div>
          </div>
          <button onClick={() => setModalEmpreiteira(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#185FA5]/20 hover:bg-[#185FA5]/30 border border-[#185FA5]/40 text-[#185FA5] text-xs font-medium rounded-xl transition"
            title="Adicionar empreiteira">
            <Building2 size={14} /> Empreiteira
          </button>
        </div>
        <div className="max-w-2xl mx-auto mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">{respondidos}/{totalItens} itens</span>
            <div className="flex items-center gap-3 text-xs"><span className="text-green-400">{conformes} C</span><span className="text-red-400">{naoConformes} NC</span><span className="font-bold text-white">{progresso}%</span></div>
          </div>
          <div className="h-1.5 bg-[#2a2d4a] rounded-full overflow-hidden"><div className="h-full bg-[#185FA5] rounded-full transition-all duration-500" style={{ width: progresso + '%' }} /></div>
        </div>
        {/* Chips de empresas */}
        {chips.length > 1 && (
          <div className="max-w-2xl mx-auto mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-600">Empresas:</span>
            {chips.map(c => (
              <span key={c.id} className={'text-xs px-2 py-0.5 rounded-full font-medium ' + c.color}>{c.abrev}</span>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {CHECKLIST.map(bloco => {
          const itensBloco = bloco.itens.map(i => itens[i.id]).filter(Boolean)
          const respondidosBloco = itensBloco.filter(i => i.resposta !== '').length
          const ncBloco = itensBloco.filter(i => i.resposta === 'NC').length
          const aberto = secoesAbertas[bloco.id]
          return (
            <div key={bloco.id} className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl overflow-hidden">
              <button onClick={() => toggleSecao(bloco.id)} className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-[#1a1d2e] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#185FA5] flex-shrink-0">{bloco.ref}</span>
                    <span className="font-semibold text-white text-sm">{bloco.titulo.split('—').slice(1).join('—').trim() || bloco.titulo}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500">{respondidosBloco}/{bloco.itens.length} respondidos</span>
                    {ncBloco > 0 && <span className="text-xs text-[#A32D2D] bg-[#FCEBEB] px-2 py-0.5 rounded-full font-medium">{ncBloco} NC</span>}
                    {respondidosBloco === bloco.itens.length && <span className="text-xs text-[#3B6D11] bg-[#EAF3DE] px-2 py-0.5 rounded-full font-medium">Concluído</span>}
                  </div>
                </div>
                {aberto ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
              </button>

              {aberto && (
                <div className="border-t border-[#2a2d4a] divide-y divide-[#2a2d4a]/60">
                  {bloco.itens.map(item => {
                    const it = itens[item.id]
                    if (!it) return null
                    const fotosItem = fotos[item.id] || []
                    return (
                      <div key={item.id} className="px-4 py-4">
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + NIVEL_CONFIG[item.nivel].bg + ' ' + NIVEL_CONFIG[item.nivel].text}>{NIVEL_CONFIG[item.nivel].label}</span>
                          <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + MULTA_CONFIG[item.multa].bg + ' ' + MULTA_CONFIG[item.multa].text}>{MULTA_INFO[item.multa].label} {MULTA_INFO[item.multa].faixa}</span>
                          <span className="text-xs text-slate-600 bg-[#2a2d4a]/50 px-2 py-0.5 rounded-full">{item.ref}</span>
                          <button onClick={() => setModalNr(item)} className="ml-auto p-1 text-slate-600 hover:text-[#185FA5] transition" title="Ver texto legal"><Info size={14} /></button>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed mb-3">{item.t}</p>
                        <div className="flex gap-2 mb-3">
                          {(['C', 'NC', 'NA'] as const).map(r => (
                            <button key={r} onClick={() => setResposta(item.id, r)}
                              className={'flex-1 py-2.5 rounded-xl border text-xs font-bold transition ' + (
                                it.resposta === r
                                  ? r === 'C'  ? 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]'
                                  : r === 'NC' ? 'border-[#A32D2D] bg-[#FCEBEB] text-[#A32D2D]'
                                  :              'border-[#888780] bg-[#F1EFE8] text-[#555552]'
                                  : 'border-[#2a2d4a] text-slate-500 hover:border-slate-500'
                              )}>
                              {r === 'C' ? '✓ Conforme' : r === 'NC' ? '✗ Não conforme' : '— N/A'}
                            </button>
                          ))}
                        </div>
                        {it.resposta === 'NC' && (
                          <div className="space-y-2 pl-1 border-l-2 border-[#A32D2D]/30">
                            {/* Chips de empresa */}
                            {chips.length > 0 && (
                              <div className="pl-2">
                                <div className="text-xs text-slate-500 mb-1.5">Empresa(s) responsável(is):</div>
                                <div className="flex gap-1.5 flex-wrap">
                                  {chips.map(c => {
                                    const sel = it.empresas_selecionadas.includes(c.id)
                                    return (
                                      <button key={c.id} onClick={() => toggleEmpresa(item.id, c.id)}
                                        className={'text-xs px-2.5 py-1 rounded-full font-medium transition border-2 ' + (sel ? c.color + ' border-transparent' : 'bg-transparent border-[#2a2d4a] text-slate-500 hover:border-slate-500')}>
                                        {c.abrev}
                                      </button>
                                    )
                                  })}
                                  <button onClick={() => setModalEmpreiteira(true)}
                                    className="text-xs px-2.5 py-1 rounded-full border border-[#185FA5]/40 bg-[#185FA5]/10 text-[#185FA5] hover:bg-[#185FA5]/20 transition flex items-center gap-1 font-medium">
                                    <Plus size={10} /> + empreiteira
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="relative pl-2">
                              <textarea value={it.observacao} onChange={e => setObservacao(item.id, e.target.value)}
                                placeholder="Descreva o que foi observado..." rows={3}
                                className="w-full px-3 py-2.5 pr-10 bg-[#0f1117] border border-[#2a2d4a] focus:border-[#A32D2D]/50 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none transition resize-none" />
                              <button onClick={() => gerarObservacaoIA(item.id)} disabled={it.gerando_ia}
                                title="Reescrever com IA (escreva a observação primeiro)"
                                className="absolute right-2 top-2 p-1.5 text-slate-500 hover:text-[#185FA5] transition rounded-lg hover:bg-[#185FA5]/10">
                                {it.gerando_ia ? <Loader2 size={15} className="animate-spin text-[#185FA5]" /> : <Sparkles size={15} />}
                              </button>
                            </div>
                            <div className="flex gap-2 flex-wrap pl-2">
                              {fotosItem.map((f, fi) => (
                                <div key={fi} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#2a2d4a]">
                                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                                  <button onClick={() => removerFoto(item.id, f.url, f.db_id, f.storage_path)} className="absolute top-1 right-1 p-0.5 bg-[#A32D2D] rounded-full"><Trash2 size={10} className="text-white" /></button>
                                </div>
                              ))}
                              <button onClick={() => abrirCamera(item.id)}
                                className="w-20 h-20 border border-dashed border-[#2a2d4a] hover:border-[#185FA5]/50 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#185FA5] transition">
                                <Camera size={18} /><span className="text-xs">Foto</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </main>

      {/* Footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#16192a] border-t border-[#2a2d4a] px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button onClick={salvarParcialmente} disabled={saving}
            className="flex-1 py-3 border border-[#2a2d4a] text-slate-300 hover:text-white rounded-2xl text-xs font-medium transition flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar parcial
          </button>
          <button onClick={concluirVistoria} disabled={concluindo || respondidos === 0}
            className="flex-[2] py-3 bg-[#185FA5] hover:bg-[#1a6bbf] disabled:opacity-50 text-white rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30">
            {concluindo ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Concluir e gerar relatório
          </button>
        </div>
      </div>
    </div>
  )
}
