'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Building2, MapPin, Plus,
  Loader2, ChevronRight, Search
} from 'lucide-react'

interface Empresa {
  id: string
  name: string
  cnpj: string | null
  cidade: string | null
  uf: string | null
  grau_risco: string | null
}

interface Obra {
  id: string
  name: string
  etapa: string | null
  status: string
  empresa_cliente_id: string | null
}

export default function NovaVistoriaPage() {
  const router = useRouter()
  const [step, setStep] = useState<'empresa' | 'obra' | 'dados'>('empresa')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [consultoriaId, setConsultoriaId] = useState('')
  const [avaliadorId, setAvaliadorId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [criandoObra, setCriandoObra] = useState(false)
  const [novaObraNome, setNovaObraNome] = useState('')

  // Dados da vistoria
  const [dados, setDados] = useState({
    numero: '',
    data_vistoria: new Date().toISOString().split('T')[0],
    clima: 'Bom / ensolarado',
    etapa_obra: '',
    observacoes_gerais: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      setAvaliadorId(user.id)

      const { data: av } = await supabase
        .from('avaliadores')
        .select('consultoria_id')
        .eq('id', user.id)
        .single()

      if (!av) return
      setConsultoriaId(av.consultoria_id)

      // Gera número da vistoria automaticamente
      const { count } = await supabase
        .from('vistorias')
        .select('*', { count: 'exact', head: true })
        .eq('consultoria_id', av.consultoria_id)

      const num = String((count || 0) + 1).padStart(3, '0')
      const ano = new Date().getFullYear()
      setDados(d => ({ ...d, numero: `${num}/${ano}` }))

      // Empresas
      const { data: emps } = await supabase
        .from('empresas_clientes')
        .select('id, name, cnpj, cidade, uf, grau_risco')
        .eq('consultoria_id', av.consultoria_id)
        .eq('active', true)
        .order('name')

      setEmpresas(emps || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadObras(empresaId: string) {
    const { data } = await supabase
      .from('obras')
      .select('id, name, etapa, status, empresa_cliente_id')
      .eq('empresa_cliente_id', empresaId)
      .neq('status', 'cancelada')
      .order('created_at', { ascending: false })
    setObras(data || [])
  }

  async function selectEmpresa(emp: Empresa) {
    setSelectedEmpresa(emp)
    setSelectedObra(null)
    await loadObras(emp.id)
    setStep('obra')
  }

  async function criarObra() {
    if (!novaObraNome.trim()) { toast.error('Digite o nome da obra'); return }
    if (!selectedEmpresa) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('obras')
        .insert({
          name: novaObraNome,
          consultoria_id: consultoriaId,
          empresa_cliente_id: selectedEmpresa.id,
          avaliador_id: avaliadorId,
          status: 'ativa',
          empresa_nome: selectedEmpresa.name,
          empresa_cnpj: selectedEmpresa.cnpj,
        })
        .select()
        .single()
      if (error) throw error
      toast.success('Obra criada!')
      setSelectedObra(data)
      setNovaObraNome('')
      setCriandoObra(false)
      await loadObras(selectedEmpresa.id)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar obra')
    } finally {
      setSaving(false)
    }
  }

  async function iniciarVistoria() {
    if (!selectedObra) { toast.error('Selecione uma obra'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('vistorias')
        .insert({
          obra_id: selectedObra.id,
          consultoria_id: consultoriaId,
          avaliador_id: avaliadorId,
          numero: dados.numero,
          data_vistoria: dados.data_vistoria,
          clima: dados.clima,
          etapa_obra: dados.etapa_obra || selectedObra.etapa || '',
          observacoes_gerais: dados.observacoes_gerais || null,
          status: 'em_andamento',
        })
        .select()
        .single()
      if (error) throw error
      toast.success('Vistoria iniciada!')
      router.push(`/dashboard/vistorias/${data.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar vistoria')
    } finally {
      setSaving(false)
    }
  }

  const empresasFiltradas = empresas.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.cnpj || '').includes(search)
  )

  const grauColors: Record<string, string> = {
    '1': 'bg-green-900/40 text-green-400',
    '2': 'bg-blue-900/40 text-blue-400',
    '3': 'bg-amber-900/40 text-amber-400',
    '4': 'bg-red-900/40 text-red-400',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* Header */}
      <header className="bg-[#16192a] border-b border-[#2a2d4a] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => step === 'empresa' ? router.push('/dashboard') : setStep(step === 'obra' ? 'empresa' : 'obra')}
          className="p-2 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white">Nova Vistoria NR 18</h1>
          <p className="text-xs text-slate-500">
            {step === 'empresa' ? 'Selecione a empresa' : step === 'obra' ? 'Selecione a obra' : 'Dados da vistoria'}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          {['empresa', 'obra', 'dados'].map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition ${
                step === s ? 'bg-[#185FA5]' :
                ['empresa', 'obra', 'dados'].indexOf(step) > i ? 'bg-green-500' :
                'bg-[#2a2d4a]'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* STEP 1 — Empresa */}
        {step === 'empresa' && (
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Qual empresa será vistoriada?</h2>
            <p className="text-slate-400 text-sm mb-4">Selecione a empresa cliente</p>

            {/* Busca */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full pl-9 pr-4 py-3 bg-[#16192a] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
              />
            </div>

            {empresasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <Building2 size={36} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhuma empresa encontrada</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {empresasFiltradas.map(e => (
                  <button
                    key={e.id}
                    onClick={() => selectEmpresa(e)}
                    className="bg-[#16192a] border border-[#2a2d4a] hover:border-[#185FA5]/50 rounded-2xl p-4 flex items-center gap-3 transition text-left w-full"
                  >
                    <div className="w-10 h-10 bg-[#185FA5]/20 border border-[#185FA5]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#185FA5]">
                        {e.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">{e.name}</span>
                        {e.grau_risco && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${grauColors[e.grau_risco]}`}>
                            Grau {e.grau_risco}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {e.cnpj && <span className="text-xs text-slate-500">{e.cnpj}</span>}
                        {e.cidade && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={10} /> {e.cidade}/{e.uf}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Obra */}
        {step === 'obra' && selectedEmpresa && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500">Empresa:</span>
              <span className="text-xs font-medium text-[#185FA5]">{selectedEmpresa.name}</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Qual obra será vistoriada?</h2>
            <p className="text-slate-400 text-sm mb-4">Selecione uma obra existente ou crie uma nova</p>

            <div className="flex flex-col gap-2 mb-4">
              {obras.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setSelectedObra(o); setStep('dados') }}
                  className={`bg-[#16192a] border rounded-2xl p-4 flex items-center gap-3 transition text-left w-full ${
                    selectedObra?.id === o.id
                      ? 'border-[#185FA5] bg-[#185FA5]/5'
                      : 'border-[#2a2d4a] hover:border-[#185FA5]/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">{o.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {o.etapa && <span className="text-xs text-slate-500">{o.etapa}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        o.status === 'ativa' ? 'bg-green-900/40 text-green-400' :
                        o.status === 'concluida' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>{o.status}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Criar nova obra */}
            {criandoObra ? (
              <div className="bg-[#16192a] border border-[#185FA5]/50 rounded-2xl p-4">
                <p className="text-sm font-medium text-white mb-3">Nova obra</p>
                <input
                  type="text"
                  value={novaObraNome}
                  onChange={e => setNovaObraNome(e.target.value)}
                  placeholder="Nome da obra"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition mb-3"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setCriandoObra(false)}
                    className="flex-1 py-2.5 border border-[#2a2d4a] text-slate-400 rounded-xl text-sm transition hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={criarObra}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-[#185FA5] text-white font-medium rounded-xl text-sm transition hover:bg-[#1a6bbf] flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Criar obra
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCriandoObra(true)}
                className="w-full py-3 border border-dashed border-[#2a2d4a] hover:border-[#185FA5]/50 text-slate-400 hover:text-white rounded-2xl text-sm transition flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Criar nova obra
              </button>
            )}
          </div>
        )}

        {/* STEP 3 — Dados da vistoria */}
        {step === 'dados' && selectedObra && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500">Obra:</span>
              <span className="text-xs font-medium text-[#185FA5]">{selectedObra.name}</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Dados da vistoria</h2>
            <p className="text-slate-400 text-sm mb-5">Confirme as informações antes de iniciar</p>

            <div className="flex flex-col gap-4">

              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-slate-400">Nº da vistoria</label>
                  <input
                    type="text"
                    value={dados.numero}
                    onChange={e => setDados(d => ({ ...d, numero: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#16192a] border border-[#2a2d4a] rounded-xl text-white text-sm focus:outline-none focus:border-[#185FA5] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-slate-400">Data</label>
                  <input
                    type="date"
                    value={dados.data_vistoria}
                    onChange={e => setDados(d => ({ ...d, data_vistoria: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#16192a] border border-[#2a2d4a] rounded-xl text-white text-sm focus:outline-none focus:border-[#185FA5] transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Condições climáticas</label>
                <select
                  value={dados.clima}
                  onChange={e => setDados(d => ({ ...d, clima: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#16192a] border border-[#2a2d4a] rounded-xl text-white text-sm focus:outline-none focus:border-[#185FA5] transition"
                >
                  <option>Bom / ensolarado</option>
                  <option>Nublado</option>
                  <option>Chuva fraca</option>
                  <option>Chuva forte</option>
                  <option>Vento forte (acima de 42 km/h)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Etapa atual da obra</label>
                <select
                  value={dados.etapa_obra}
                  onChange={e => setDados(d => ({ ...d, etapa_obra: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#16192a] border border-[#2a2d4a] rounded-xl text-white text-sm focus:outline-none focus:border-[#185FA5] transition"
                >
                  <option value="">Selecione</option>
                  <option>Terraplanagem</option>
                  <option>Fundação / escavação</option>
                  <option>Estrutura de concreto</option>
                  <option>Estrutura metálica</option>
                  <option>Alvenaria</option>
                  <option>Instalações hidráulicas</option>
                  <option>Instalações elétricas</option>
                  <option>Cobertura / telhado</option>
                  <option>Impermeabilização</option>
                  <option>Revestimento / acabamento</option>
                  <option>Pintura</option>
                  <option>Obra concluída</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Observações iniciais</label>
                <textarea
                  value={dados.observacoes_gerais}
                  onChange={e => setDados(d => ({ ...d, observacoes_gerais: e.target.value }))}
                  placeholder="Condições gerais observadas, atividades em andamento..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#16192a] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition resize-none"
                />
              </div>

              <button
                onClick={iniciarVistoria}
                disabled={saving}
                className="w-full py-4 bg-[#185FA5] hover:bg-[#1a6bbf] disabled:opacity-50 text-white font-semibold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
              >
                {saving ? (
                  <><Loader2 size={18} className="animate-spin" /> Iniciando...</>
                ) : (
                  <>Iniciar vistoria NR 18 →</>
                )}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}