'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CHECKLIST, MULTA_INFO, type ChecklistItem } from '@/lib/checklist-data'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Camera, Trash2, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, Sparkles, FileText, Save,
  AlertTriangle, Info, X
} from 'lucide-react'

type Resposta = 'C' | 'NC' | 'NA' | ''

interface ItemState {
  bloco_id: string; item_id: string; resposta: Resposta
  observacao: string; db_id?: string; gerando_ia?: boolean
}

interface VistoriaInfo {
  id: string; numero: string; data_vistoria: string; status: string
  obra: { name: string; empresa_cliente: { name: string } | null } | null
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

export default function ChecklistPage() {
  const router = useRouter()
  const params = useParams()
  const vistoriaId = params.id as string
  const [vistoria, setVistoria] = useState<VistoriaInfo | null>(null)
  const [itens, setItens] = useState<Record<string, ItemState>>({})
  const [fotos, setFotos] = useState<Record<string, { url: string; storage_path?: string; db_id?: string }[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({ pgr: true })
  const [modalNr, setModalNr] = useState<ChecklistItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fotoItemAlvo, setFotoItemAlvo] = useState<string | null>(null)

  useEffect(() => { init() }, [vistoriaId])

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: v } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, status, obra:obras(name, empresa_cliente:empresas_clientes(name))')
        .eq('id', vistoriaId).single()
      if (!v) { toast.error('Vistoria nao encontrada'); router.push('/dashboard'); return }
      setVistoria(v as any)
      const estado: Record<string, ItemState> = {}
      CHECKLIST.forEach(bloco => {
        bloco.itens.forEach(item => {
          estado[item.id] = { bloco_id: bloco.id, item_id: item.id, resposta: '', observacao: '' }
        })
      })
      const { data: saved } = await supabase.from('vistoria_itens').select('*').eq('vistoria_id', vistoriaId)
      if (saved && saved.length > 0) {
        saved.forEach((s: any) => {
          if (estado[s.item_id]) {
            estado[s.item_id].resposta = s.status || ''
            estado[s.item_id].observacao = s.observacao || ''
            estado[s.item_id].db_id = s.id
          }
        })
      }
      setItens(estado)
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

  function setResposta(item_id: string, resposta: Resposta) {
    setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], resposta } }))
  }
  function setObservacao(item_id: string, obs: string) {
    setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], observacao: obs } }))
  }
  function toggleSecao(id: string) {
    setSecoesAbertas(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function salvarChecklist(silent = false) {
    setSaving(true)
    try {
      const respondidos = Object.values(itens).filter(i => i.resposta !== '')
      if (respondidos.length === 0) { if (!silent) toast.error('Responda pelo menos um item'); setSaving(false); return }
      for (const it of respondidos) {
        const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === it.item_id)
        if (!item) continue
        if (it.db_id) {
          await supabase.from('vistoria_itens').update({ status: it.resposta, observacao: it.observacao || null }).eq('id', it.db_id)
        } else {
          const bloco = CHECKLIST.find(b => b.itens.some(i => i.id === it.item_id))
          const { data, error } = await supabase.from('vistoria_itens').insert({
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
          if (error) console.error('Insert error:', error.message)
          if (data) setItens(prev => ({ ...prev, [it.item_id]: { ...prev[it.item_id], db_id: data.id } }))
        }
      }
      if (!silent) toast.success('Progresso salvo!')
    } catch (err: any) { if (!silent) toast.error(err.message || 'Erro ao salvar') }
    finally { setSaving(false) }
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
      if (!item) return
      const { data } = await supabase.from('vistoria_itens').insert({
        vistoria_id: vistoriaId, item_id, bloco_id: it.bloco_id,
        status: it.resposta || 'NC', observacao: it.observacao || null,
        item_nr_texto: item.nr, item_multa: item.multa,
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
    if (!it.observacao || it.observacao.trim().length < 10) { toast.error('Escreva a observacao antes de usar a IA (minimo 10 caracteres)'); return }
    setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], gerando_ia: true } }))
    try {
      const item = CHECKLIST.flatMap(b => b.itens).find(i => i.id === item_id)
      const bloco = CHECKLIST.find(b => b.itens.some(i => i.id === item_id))
      const res = await fetch('/api/ia-observacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_codigo: item?.ref,
          item_descricao: item?.t,
          secao_nome: bloco?.titulo,
          empresa: vistoria?.obra?.empresa_cliente?.name || 'empresa',
          obra: vistoria?.obra?.name || 'obra',
          texto_avaliador: it.observacao,
        }),
      })
      const json = await res.json()
      if (json.observacao) { setObservacao(item_id, json.observacao); toast.success('Observacao gerada!') }
    } catch { toast.error('Erro ao gerar observacao') }
    finally { setItens(prev => ({ ...prev, [item_id]: { ...prev[item_id], gerando_ia: false } })) }
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
      await salvarChecklist(true)
      const { error } = await supabase.from('vistorias').update({
        status: 'concluida', total_itens: respondidos.length, total_conformes: conformes,
        total_nao_conformes: ncs, total_na: na, indice_conformidade: indice, classificacao,
      }).eq('id', vistoriaId)
      if (error) throw error
      toast.success('Vistoria concluida! Indice: ' + indice + '%')
      router.push('/dashboard/vistorias/' + vistoriaId + '/relatorio')
    } catch (err: any) { toast.error(err.message || 'Erro ao concluir') }
    finally { setConcluindo(false) }
  }

  const todosItens = Object.values(itens)
  const totalItens = todosItens.length
  const respondidos = todosItens.filter(i => i.resposta !== '').length
  const conformes = todosItens.filter(i => i.resposta === 'C').length
  const naoConformes = todosItens.filter(i => i.resposta === 'NC').length
  const progresso = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#0f1117] pb-28">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFotoChange} />

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

      <header className="bg-[#16192a] border-b border-[#2a2d4a] px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 text-slate-400 hover:text-white transition"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">Checklist NR-18 — {vistoria?.obra?.empresa_cliente?.name || vistoria?.obra?.name}</h1>
            <p className="text-xs text-slate-500">Vistoria {vistoria?.numero} · {vistoria?.data_vistoria ? new Date(vistoria.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
          </div>
          <button onClick={() => salvarChecklist(false)} disabled={saving} className="p-2 text-slate-400 hover:text-[#185FA5] transition">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}</button>
        </div>
        <div className="max-w-2xl mx-auto mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">{respondidos}/{totalItens} itens</span>
            <div className="flex items-center gap-3 text-xs"><span className="text-green-400">{conformes} C</span><span className="text-red-400">{naoConformes} NC</span><span className="font-bold text-white">{progresso}%</span></div>
          </div>
          <div className="h-1.5 bg-[#2a2d4a] rounded-full overflow-hidden"><div className="h-full bg-[#185FA5] rounded-full transition-all duration-500" style={{ width: progresso + '%' }} /></div>
        </div>
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
                    {respondidosBloco === bloco.itens.length && <span className="text-xs text-[#3B6D11] bg-[#EAF3DE] px-2 py-0.5 rounded-full font-medium">Concluido</span>}
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
                            <div className="relative pl-2">
                              <textarea value={it.observacao} onChange={e => setObservacao(item.id, e.target.value)}
                                placeholder="Descreva a nao conformidade..." rows={3}
                                className="w-full px-3 py-2.5 pr-10 bg-[#0f1117] border border-[#2a2d4a] focus:border-[#A32D2D]/50 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none transition resize-none" />
                              <button onClick={() => gerarObservacaoIA(item.id)} disabled={it.gerando_ia} title="Reescrever em linguagem tecnica (escreva a observacao primeiro)"
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
                              <button onClick={() => abrirCamera(item.id)} className="w-20 h-20 border border-dashed border-[#2a2d4a] hover:border-[#185FA5]/50 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#185FA5] transition">
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

      <div className="fixed bottom-0 left-0 right-0 bg-[#16192a] border-t border-[#2a2d4a] px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button onClick={() => salvarChecklist(false)} disabled={saving}
            className="flex-1 py-3 border border-[#2a2d4a] text-slate-300 hover:text-white rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
          </button>
          <button onClick={concluirVistoria} disabled={concluindo || respondidos === 0}
            className="flex-[2] py-3 bg-[#185FA5] hover:bg-[#1a6bbf] disabled:opacity-50 text-white rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30">
            {concluindo ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Concluir e gerar relatorio
          </button>
        </div>
      </div>
    </div>
  )
}
