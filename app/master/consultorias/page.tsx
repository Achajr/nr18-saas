'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Building2, X, Loader2,
  CheckCircle, AlertCircle, Users, FileText, Pencil
} from 'lucide-react'

interface Consultoria {
  id: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  responsavel_nome: string | null
  responsavel_email: string | null
  plan: string
  max_avaliadores: number
  max_empresas: number
  max_obras: number
  active: boolean
  created_at: string
}

const PLANOS = [
  {
    value: 'free',
    label: 'Free',
    desc: '1 avaliador · 1 empresa',
    max_avaliadores: 1,
    max_empresas: 1,
    max_obras: 999,
    color: 'text-slate-300',
  },
  {
    value: 'pro',
    label: 'Pro',
    desc: '5 avaliadores · 30 empresas',
    max_avaliadores: 5,
    max_empresas: 30,
    max_obras: 999,
    color: 'text-blue-300',
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    desc: 'Ilimitado',
    max_avaliadores: 9999,
    max_empresas: 9999,
    max_obras: 9999,
    color: 'text-purple-300',
  },
]

const emptyForm = {
  name: '',
  cnpj: '',
  email: '',
  phone: '',
  responsavel_nome: '',
  responsavel_email: '',
  plan: 'pro',
  observacoes: '',
}

export default function ConsultoriasPage() {
  const router = useRouter()
  const [consultorias, setConsultorias] = useState<Consultoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)

  useEffect(() => { loadConsultorias() }, [])

  async function loadConsultorias() {
    const { data } = await supabase
      .from('consultorias')
      .select('*')
      .order('created_at', { ascending: false })
    setConsultorias(data || [])
    setLoading(false)
  }

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function buscarCnpj(cnpj: string) {
    const numeros = cnpj.replace(/\D/g, '')
    if (numeros.length !== 14) return
    setBuscandoCnpj(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeros}`)
      if (!res.ok) { toast.error('CNPJ não encontrado na Receita Federal'); return }
      const data = await res.json()
      setForm(f => ({
        ...f,
        cnpj,
        name: data.razao_social || f.name,
        email: data.email ? data.email.toLowerCase() : f.email,
        phone: data.ddd_telefone_1
          ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2).trim()}`
          : f.phone,
      }))
      toast.success('Dados preenchidos automaticamente!')
    } catch {
      toast.error('Erro ao consultar CNPJ')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  function handleCnpjChange(value: string) {
    const nums = value.replace(/\D/g, '').slice(0, 14)
    let masked = nums
    if (nums.length > 2)  masked = nums.slice(0,2) + '.' + nums.slice(2)
    if (nums.length > 5)  masked = nums.slice(0,2) + '.' + nums.slice(2,5) + '.' + nums.slice(5)
    if (nums.length > 8)  masked = nums.slice(0,2) + '.' + nums.slice(2,5) + '.' + nums.slice(5,8) + '/' + nums.slice(8)
    if (nums.length > 12) masked = nums.slice(0,2) + '.' + nums.slice(2,5) + '.' + nums.slice(5,8) + '/' + nums.slice(8,12) + '-' + nums.slice(12)
    update('cnpj', masked)
    if (nums.length === 14) buscarCnpj(masked)
  }

  function openNova() {
    setEditId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(c: Consultoria) {
    setEditId(c.id)
    setForm({
      name: c.name,
      cnpj: c.cnpj || '',
      email: c.email || '',
      phone: c.phone || '',
      responsavel_nome: c.responsavel_nome || '',
      responsavel_email: c.responsavel_email || '',
      plan: c.plan,
      observacoes: '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) { toast.error('Nome da consultoria é obrigatório'); return }
    setSaving(true)
    try {
      const plano = PLANOS.find(p => p.value === form.plan) || PLANOS[1]

      if (editId) {
        const { error } = await supabase
          .from('consultorias')
          .update({
            name: form.name,
            cnpj: form.cnpj || null,
            email: form.email || null,
            phone: form.phone || null,
            responsavel_nome: form.responsavel_nome || null,
            responsavel_email: form.responsavel_email || null,
            plan: form.plan,
            max_avaliadores: plano.max_avaliadores,
            max_empresas: plano.max_empresas,
            max_obras: plano.max_obras,
          })
          .eq('id', editId)
        if (error) throw error
        toast.success('Consultoria atualizada!')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase
          .from('consultorias')
          .insert({
            name: form.name,
            cnpj: form.cnpj || null,
            email: form.email || null,
            phone: form.phone || null,
            responsavel_nome: form.responsavel_nome || null,
            responsavel_email: form.responsavel_email || null,
            plan: form.plan,
            max_avaliadores: plano.max_avaliadores,
            max_empresas: plano.max_empresas,
            max_obras: plano.max_obras,
            active: true,
            created_by: user?.id,
          })
        if (error) throw error
        toast.success('Consultoria cadastrada!')
      }
      setShowModal(false)
      loadConsultorias()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Consultoria) {
    const { error } = await supabase
      .from('consultorias')
      .update({ active: !c.active })
      .eq('id', c.id)
    if (error) { toast.error('Erro ao atualizar'); return }
    toast.success(c.active ? 'Consultoria desativada' : 'Consultoria ativada')
    loadConsultorias()
  }

  const planColors: Record<string, string> = {
    free:       'bg-slate-700 text-slate-300',
    pro:        'bg-blue-900 text-blue-300',
    enterprise: 'bg-purple-900 text-purple-300',
  }

  const planLabel = (plan: string, max_avaliadores: number, max_empresas: number) => {
    if (plan === 'enterprise') return 'Ilimitado'
    return `${max_avaliadores} aval. · ${max_empresas} emp.`
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* Header */}
      <header className="bg-[#16192a] border-b border-[#2a2d4a] px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push('/master')} className="p-2 text-slate-400 hover:text-white transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white">Gerenciar Consultorias</h1>
          <p className="text-xs text-slate-500">Painel Master</p>
        </div>
        <button
          onClick={openNova}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#185FA5] hover:bg-[#1a6bbf] text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={15} />
          Nova consultoria
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[#185FA5]" />
          </div>
        ) : consultorias.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">Nenhuma consultoria cadastrada</p>
            <button
              onClick={openNova}
              className="mt-4 px-6 py-2.5 bg-[#185FA5] text-white text-sm rounded-xl hover:bg-[#1a6bbf] transition"
            >
              Cadastrar primeira consultoria
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {consultorias.map(c => (
              <div key={c.id} className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-5">
                <div className="flex items-start gap-4">

                  {/* Avatar */}
                  <div className="w-12 h-12 bg-[#185FA5]/20 border border-[#185FA5]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-[#185FA5]">
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[c.plan]}`}>
                        {c.plan}
                      </span>
                      {c.active
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">Ativa</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativa</span>
                      }
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {c.cnpj && <span className="text-xs text-slate-500">{c.cnpj}</span>}
                      {c.email && <span className="text-xs text-slate-500">{c.email}</span>}
                      {c.responsavel_nome && <span className="text-xs text-slate-500">Resp: {c.responsavel_nome}</span>}
                    </div>
                    <div className="flex gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users size={13} className="text-slate-500" />
                        {c.plan === 'enterprise' ? 'Avaliadores ilimitados' : `${c.max_avaliadores} avaliador${c.max_avaliadores > 1 ? 'es' : ''}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Building2 size={13} className="text-slate-500" />
                        {c.plan === 'enterprise' ? 'Empresas ilimitadas' : `${c.max_empresas} empresa${c.max_empresas > 1 ? 's' : ''}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <FileText size={13} className="text-slate-500" />
                        Vistorias ilimitadas
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-[#2a2d4a] rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => toggleActive(c)}
                      className={`p-2 rounded-lg transition ${c.active
                        ? 'text-green-400 hover:bg-green-900/20'
                        : 'text-red-400 hover:bg-red-900/20'}`}
                      title={c.active ? 'Desativar' : 'Ativar'}
                    >
                      {c.active ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d4a] sticky top-0 bg-[#16192a]">
              <h2 className="font-semibold text-white">
                {editId ? 'Editar consultoria' : 'Nova consultoria'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">

              {/* Dados */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dados da consultoria</p>
                <div className="flex flex-col gap-3">

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">CNPJ</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.cnpj}
                        onChange={e => handleCnpjChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition pr-10"
                      />
                      {buscandoCnpj && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 size={16} className="animate-spin text-[#185FA5]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">Digite o CNPJ — dados preenchidos automaticamente via Receita Federal</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Razão social *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="Consultoria SST Brasil Ltda"
                      className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-slate-400">Telefone</label>
                      <input
                        type="text"
                        value={form.phone}
                        onChange={e => update('phone', e.target.value)}
                        placeholder="(27) 99999-0000"
                        className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-slate-400">E-mail</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => update('email', e.target.value)}
                        placeholder="contato@consultoria.com.br"
                        className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsável */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Responsável</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Nome</label>
                    <input
                      type="text"
                      value={form.responsavel_nome}
                      onChange={e => update('responsavel_nome', e.target.value)}
                      placeholder="Dr. João Silva"
                      className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">E-mail</label>
                    <input
                      type="email"
                      value={form.responsavel_email}
                      onChange={e => update('responsavel_email', e.target.value)}
                      placeholder="joao@consultoria.com.br"
                      className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Plano */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Plano contratado</p>
                <div className="grid grid-cols-3 gap-2">
                  {PLANOS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => update('plan', p.value)}
                      className={`py-4 px-3 rounded-xl border text-sm font-medium transition flex flex-col items-center gap-1.5 ${
                        form.plan === p.value
                          ? 'border-[#185FA5] bg-[#185FA5]/10 text-white'
                          : 'border-[#2a2d4a] text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <span className={`font-semibold ${form.plan === p.value ? 'text-white' : p.color}`}>
                        {p.label}
                      </span>
                      <span className="text-xs font-normal text-slate-500 text-center leading-tight">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Vistorias ilimitadas em todos os planos.
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-[#2a2d4a] text-slate-400 hover:text-white rounded-xl text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#185FA5] hover:bg-[#1a6bbf] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                    : 'Salvar'
                  }
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}