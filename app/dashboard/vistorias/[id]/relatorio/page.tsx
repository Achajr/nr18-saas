'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, HardHat, CloudSun,
  AlertTriangle, FileText, Loader2
} from 'lucide-react'

interface VistoriaCompleta {
  id: string; numero: string; data_vistoria: string; clima: string; etapa_obra: string
  observacoes_gerais: string; status: string; total_itens: number; total_conformes: number
  total_nao_conformes: number; total_na: number; indice_conformidade: number; classificacao: string
  obra: { name: string; empresa_cliente: { name: string; cnpj: string | null; cidade: string | null; uf: string | null } | null } | null
  avaliador: { full_name: string; registro_mte: string | null; crea: string | null; consultoria: { name: string; cnpj: string | null } | null } | null
}

interface ItemNC {
  id: string; item_codigo: string; item_descricao: string; secao_codigo: string; secao_nome: string
  observacao: string | null; fotos: { url: string }[]
}

export default function RelatorioPage() {
  const router = useRouter()
  const params = useParams()
  const vistoriaId = params.id as string
  const [vistoria, setVistoria] = useState<VistoriaCompleta | null>(null)
  const [ncs, setNcs] = useState<ItemNC[]>([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)

  useEffect(() => { loadRelatorio() }, [vistoriaId])

  async function loadRelatorio() {
    try {
      const { data: v } = await supabase
        .from('vistorias')
        .select('*, obra:obras(name, empresa_cliente:empresas_clientes(name, cnpj, cidade, uf)), avaliador:avaliadores(full_name, registro_mte, crea, consultoria:consultorias(name, cnpj))')
        .eq('id', vistoriaId).single()
      if (!v) { toast.error('Vistoria nao encontrada'); return }
      setVistoria(v as any)
      const { data: itensNC } = await supabase
        .from('vistoria_itens').select('id, item_codigo, item_descricao, secao_codigo, secao_nome, observacao')
        .eq('vistoria_id', vistoriaId).eq('resposta', 'NC').order('item_codigo')
      if (itensNC && itensNC.length > 0) {
        const ncsComFotos = await Promise.all(itensNC.map(async (nc: any) => {
          const { data: fotos } = await supabase.from('vistoria_fotos').select('url').eq('item_id', nc.id)
          return { ...nc, fotos: fotos || [] }
        }))
        setNcs(ncsComFotos)
      }
    } catch (err) { console.error(err); toast.error('Erro ao carregar relatorio') }
    finally { setLoading(false) }
  }

  function gerarPDF() { setGerando(true); setTimeout(() => { window.print(); setGerando(false) }, 300) }

  const classConfig: Record<string, { color: string; bg: string; border: string }> = {
    'Satisfatorio':              { color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-500/30' },
    'Parcialmente satisfatorio': { color: 'text-amber-400',  bg: 'bg-amber-900/20',  border: 'border-amber-500/30' },
    'Insatisfatorio':            { color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
    'Critico':                   { color: 'text-red-400',    bg: 'bg-red-900/20',    border: 'border-red-500/30' },
  }

  const cls = classConfig[vistoria?.classificacao || ''] || classConfig['Critico']
  const indice = vistoria?.indice_conformidade || 0
  const empresa = vistoria?.obra?.empresa_cliente

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" /></div>
  if (!vistoria) return null

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; color: black !important; } }`}</style>
      <div className="min-h-screen bg-[#0f1117] pb-24">

        <header className="no-print bg-[#16192a] border-b border-[#2a2d4a] px-4 py-4 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/vistorias/' + vistoriaId)} className="p-2 text-slate-400 hover:text-white transition"><ArrowLeft size={20} /></button>
            <div className="flex-1"><h1 className="text-sm font-bold text-white">Relatorio Tecnico NR-18</h1><p className="text-xs text-slate-500">Vistoria {vistoria.numero}</p></div>
            <button onClick={gerarPDF} disabled={gerando} className="flex items-center gap-2 px-4 py-2 bg-[#185FA5] hover:bg-[#1a6bbf] text-white text-sm font-medium rounded-xl transition">
              {gerando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Exportar PDF
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">

          {/* Cabecalho */}
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-6 mb-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1"><HardHat size={18} className="text-[#185FA5]" /><span className="text-xs text-slate-500 uppercase tracking-wider">Relatorio Tecnico de Vistoria</span></div>
                <h2 className="text-xl font-bold text-white">NR-18 — Seguranca na Construcao Civil</h2>
                <p className="text-sm text-slate-400 mt-1">{vistoria.avaliador?.consultoria?.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-[#185FA5]">#{vistoria.numero}</div>
                <div className="text-xs text-slate-500 mt-0.5">{new Date(vistoria.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f1117] rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Empresa</div>
                <div className="text-sm font-semibold text-white">{empresa?.name || '—'}</div>
                {empresa?.cnpj && <div className="text-xs text-slate-500 mt-0.5">{empresa.cnpj}</div>}
                {empresa?.cidade && <div className="text-xs text-slate-500">{empresa.cidade}/{empresa.uf}</div>}
              </div>
              <div className="bg-[#0f1117] rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Obra</div>
                <div className="text-sm font-semibold text-white">{vistoria.obra?.name || '—'}</div>
                {vistoria.etapa_obra && <div className="text-xs text-slate-500 mt-0.5">{vistoria.etapa_obra}</div>}
              </div>
              <div className="bg-[#0f1117] rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Condicoes climaticas</div>
                <div className="text-sm text-white">{vistoria.clima || '—'}</div>
              </div>
              <div className="bg-[#0f1117] rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Responsavel tecnico</div>
                <div className="text-sm font-semibold text-white">{vistoria.avaliador?.full_name || '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{vistoria.avaliador?.registro_mte ? 'MTE ' + vistoria.avaliador.registro_mte : vistoria.avaliador?.crea || ''}</div>
              </div>
            </div>
            {vistoria.observacoes_gerais && (
              <div className="mt-3 bg-[#0f1117] rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Observacoes gerais</div>
                <p className="text-sm text-slate-300">{vistoria.observacoes_gerais}</p>
              </div>
            )}
          </div>

          {/* Indice de conformidade */}
          <div className={'rounded-2xl border ' + cls.border + ' ' + cls.bg + ' p-5 mb-4'}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className={'text-lg font-bold ' + cls.color}>{vistoria.classificacao}</div>
                <div className="text-xs text-slate-500">Classificacao da vistoria</div>
              </div>
              <div className="text-right">
                <div className={'text-4xl font-bold ' + cls.color}>{indice}%</div>
                <div className="text-xs text-slate-500">Indice de conformidade</div>
              </div>
            </div>
            <div className="h-3 bg-[#0f1117] rounded-full overflow-hidden mb-4">
              <div className={'h-full rounded-full transition-all ' + (indice >= 90 ? 'bg-green-500' : indice >= 70 ? 'bg-amber-500' : indice >= 50 ? 'bg-orange-500' : 'bg-red-500')} style={{ width: indice + '%' }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Total', val: vistoria.total_itens, color: 'text-white' },
                { label: 'Conformes', val: vistoria.total_conformes, color: 'text-green-400' },
                { label: 'Nao conformes', val: vistoria.total_nao_conformes, color: 'text-red-400' },
                { label: 'Nao se aplica', val: vistoria.total_na, color: 'text-slate-400' },
              ].map((c, i) => (
                <div key={i} className="bg-[#0f1117]/50 rounded-xl py-2 px-1">
                  <div className={'text-2xl font-bold ' + c.color}>{c.val}</div>
                  <div className="text-xs text-slate-500 leading-tight">{c.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nao Conformidades */}
          {ncs.length > 0 && (
            <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-4 border-b border-[#2a2d4a] flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <h3 className="font-semibold text-white text-sm">Nao Conformidades ({ncs.length})</h3>
              </div>
              <div className="divide-y divide-[#2a2d4a]">
                {ncs.map((nc, idx) => (
                  <div key={nc.id} className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-900/40 border border-red-500/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-red-400">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500">{nc.item_codigo}</span>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs text-slate-500">{nc.secao_nome}</span>
                        </div>
                        <p className="text-sm font-medium text-white">{nc.item_descricao}</p>
                        {nc.observacao && (
                          <div className="mt-2 bg-[#0f1117] rounded-xl p-3">
                            <div className="text-xs text-slate-500 mb-1">Observacao do tecnico</div>
                            <p className="text-sm text-slate-300 italic">"{nc.observacao}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {nc.fotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap ml-10">
                        {nc.fotos.map((f, fi) => (
                          <div key={fi} className="w-28 h-28 rounded-xl overflow-hidden border border-[#2a2d4a]">
                            <img src={f.url} alt={'Foto NC ' + (idx+1) + '.' + (fi+1)} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assinatura */}
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Assinatura e Responsabilidade Tecnica</h3>
            <div className="flex flex-col items-center gap-2">
              <div className="w-64 border-b border-slate-600 mb-1" />
              <div className="text-sm font-medium text-white">{vistoria.avaliador?.full_name}</div>
              <div className="text-xs text-slate-500">{vistoria.avaliador?.registro_mte ? 'Registro MTE no ' + vistoria.avaliador.registro_mte : vistoria.avaliador?.crea ? 'CREA ' + vistoria.avaliador.crea : 'Tecnico de Seguranca do Trabalho'}</div>
              <div className="text-xs text-slate-500">{vistoria.avaliador?.consultoria?.name}</div>
              <div className="text-xs text-slate-600 mt-2">Emitido em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

        </main>
      </div>
    </>
  )
}