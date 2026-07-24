'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { consultarCnpj, formatCep, formatCnpj, onlyDigits } from '@/lib/cnpj'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Building2, X, Loader2,
  CheckCircle, AlertCircle, Pencil, MapPin, Phone, Mail
} from 'lucide-react'

interface Avaliador {
  id: string
  full_name: string
  role: string
}

interface Empresa {
  id: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  endereco: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  cnae: string | null
  grau_risco: string | null
  responsavel_nome: string | null
  responsavel_cargo: string | null
  responsavel_email: string | null
  active: boolean
  avaliador_responsavel: string | null
  avaliador?: { full_name: string }
  created_at: string
}

const GRAUS = ['1', '2', '3', '4']

const emptyForm = {
  name: '',
  cnpj: '',
  email: '',
  phone: '',
  endereco: '',
  cidade: '',
  uf: '',
  cep: '',
  cnae: '',
  grau_risco: '3',
  responsavel_nome: '',
  responsavel_cargo: '',
  responsavel_email: '',
  avaliador_responsavel: '',
}

const ESTADOS_UF = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

export default function EmpresasPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [avaliadores, setAvaliadores] = useState<Avaliador[]>([])
  const [consultoriaId, setConsultoriaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: av } = await supabase
        .from('avaliadores')
        .select('consultoria_id')
        .eq('id', user.id)
        .single()

      if (!av) { router.push('/auth/login'); return }

      setConsultoriaId(av.consultoria_id)

      const [{ data: emps }, { data: avs }] = await Promise.all([
        supabase
          .from('empresas_clientes')
          .select('*, avaliador:avaliadores(full_name)')
          .eq('consultoria_id', av.consultoria_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('avaliadores')
          .select('id, full_name, role')
          .eq('consultoria_id', av.consultoria_id)
          .eq('active', true)
          .neq('role', 'viewer'),
      ])

      setEmpresas(emps || [])
      setAvaliadores(avs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Busca CNPJ automática
  async function buscarCnpj(cnpj: string) {
    const nums = onlyDigits(cnpj)
    if (nums.length !== 14) return
    setBuscandoCnpj(true)
    try {
      const data = await consultarCnpj(nums)
      setForm(f => ({
        ...f,
        cnpj: data.cnpj || f.cnpj,
        name: data.name || f.name,
        email: data.email ? data.email.toLowerCase() : f.email,
        phone: data.phone || f.phone,
        cnae: data.cnae || f.cnae,
        grau_risco: data.grau_risco || f.grau_risco,
        cep: data.cep || f.cep,
        endereco: data.endereco || f.endereco,
        cidade: data.cidade || f.cidade,
        uf: data.uf || f.uf,
      }))
      toast.success(`Dados preenchidos automaticamente. Grau de risco ${data.grau_risco}.`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao consultar CNPJ')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  function handleCnpjChange(value: string) {
    const nums = onlyDigits(value).slice(0, 14)
    const masked = formatCnpj(nums)
    update('cnpj', masked)
    if (nums.length === 14) buscarCnpj(masked)
  }

  // Busca CEP automática
  async function buscarCep(cep: string) {
    const nums = onlyDigits(cep)
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${nums}`)
      if (!res.ok) { toast.error('CEP não encontrado'); return }
      const data = await res.json()
      setForm(f => ({
        ...f,
        endereco: data.street || f.endereco,
        cidade: data.city || f.cidade,
        uf: data.state || f.uf,
      }))
      toast.success('Endereço preenchido!')
    } catch {
      toast.error('Erro ao consultar CEP')
    } finally {
      setBuscandoCep(false)
    }
  }

  function handleCepChange(value: string) {
    const nums = onlyDigits(value).slice(0, 8)
    const masked = formatCep(nums)
    update('cep', masked)
    if (nums.length === 8) buscarCep(masked)
  }

  function openNova() {
    setEditId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(e: Empresa) {
    setEditId(e.id)
    setForm({
      name: e.name,
      cnpj: e.cnpj || '',
      email: e.email || '',
      phone: e.phone || '',
      endereco: e.endereco || '',
      cidade: e.cidade || '',
      uf: e.uf || '',
      cep: e.cep || '',
      cnae: e.cnae || '',
      grau_risco: e.grau_risco || '3',
      responsavel_nome: e.responsavel_nome || '',
      responsavel_cargo: e.responsavel_cargo || '',
      responsavel_email: e.responsavel_email || '',
      avaliador_responsavel: e.avaliador_responsavel || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) { toast.error('Nome da empresa é obrigatório'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (editId) {
        const { error } = await supabase
          .from('empresas_clientes')
          .update({
            name: form.name,
            cnpj: form.cnpj || null,
            email: form.email || null,
            phone: form.phone || null,
            endereco: form.endereco || null,
            cidade: form.cidade || null,
            uf: form.uf || null,
            cep: form.cep || null,
            cnae: form.cnae || null,
            grau_risco: form.grau_risco || null,
            responsavel_nome: form.responsavel_nome || null,
            responsavel_cargo: form.responsavel_cargo || null,
            responsavel_email: form.responsavel_email || null,
            avaliador_responsavel: form.avaliador_responsavel || null,
          })
          .eq('id', editId)
        if (error) throw error
        toast.success('Empresa atualizada!')
      } else {
        const { error } = await supabase
          .from('empresas_clientes')
          .insert({
            consultoria_id: consultoriaId,
            name: form.name,
            cnpj: form.cnpj || null,
            email: form.email || null,
            phone: form.phone || null,
            endereco: form.endereco || null,
            cidade: form.cidade || null,
            uf: form.uf || null,
            cep: form.cep || null,
            cnae: form.cnae || null,
            grau_risco: form.grau_risco || null,
            responsavel_nome: form.responsavel_nome || null,
            responsavel_cargo: form.responsavel_cargo || null,
            responsavel_email: form.responsavel_email || null,
            avaliador_responsavel: form.avaliador_responsavel || null,
            active: true,
            created_by: user?.id,
          })
        if (error) throw error
        toast.success('Empresa cadastrada!')
      }
      setShowModal(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(e: Empresa) {
    const { error } = await supabase
      .from('empresas_clientes')
      .update({ active: !e.active })
      .eq('id', e.id)
    if (error) { toast.error('Erro ao atualizar'); return }
    toast.success(e.active ? 'Empresa desativada' : 'Empresa ativada')
    loadData()
  }

  const grauColors: Record<string, string> = {
    '1': 'bg-green-900/40 text-green-400',
    '2': 'bg-blue-900/40 text-blue-400',
    '3': 'bg-amber-900/40 text-amber-400',
    '4': 'bg-red-900/40 text-red-400',
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push('/consultoria')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Empresas clientes</h1>
          <p className="text-xs text-[var(--text-muted)]">Painel da Consultoria</p>
        </div>
        <button
          onClick={openNova}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={15} />
          Nova empresa
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[var(--brand)]" />
          </div>
        ) : empresas.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="text-slate-700 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">Nenhuma empresa cadastrada</p>
            <button
              onClick={openNova}
              className="mt-4 px-6 py-2.5 bg-[var(--brand)] text-white text-sm rounded-xl hover:bg-[var(--brand-hover)] transition"
            >
              Cadastrar primeira empresa
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {empresas.map(e => (
              <div key={e.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--brand)]/20 border border-[var(--brand)]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-[var(--brand)]">
                      {e.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">{e.name}</h3>
                      {e.grau_risco && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${grauColors[e.grau_risco]}`}>
                          Grau {e.grau_risco}
                        </span>
                      )}
                      {!e.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativa</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {e.cnpj && <span className="text-xs text-[var(--text-muted)]">{e.cnpj}</span>}
                      {e.cidade && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <MapPin size={10} /> {e.cidade}/{e.uf}
                        </span>
                      )}
                      {e.email && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Mail size={10} /> {e.email}
                        </span>
                      )}
                      {e.phone && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Phone size={10} /> {e.phone}
                        </span>
                      )}
                    </div>
                    {e.avaliador && (
                      <div className="mt-1.5">
                        <span className="text-xs text-[var(--text-muted)]">Avaliador: </span>
                        <span className="text-xs text-[var(--text-secondary)]">{e.avaliador.full_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(e)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded-lg transition">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => toggleActive(e)}
                      className={`p-2 rounded-lg transition ${e.active ? 'text-green-400 hover:bg-green-900/20' : 'text-red-400 hover:bg-red-900/20'}`}
                    >
                      {e.active ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
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
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)]">
              <h2 className="font-semibold text-[var(--text-primary)]">
                {editId ? 'Editar empresa' : 'Nova empresa cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">

              {/* Dados da empresa */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Dados da empresa</p>
                <div className="flex flex-col gap-3">

                  {/* CNPJ */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">CNPJ</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.cnpj}
                        onChange={e => handleCnpjChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition pr-10"
                      />
                      {buscandoCnpj && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 size={16} className="animate-spin text-[var(--brand)]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Digite o CNPJ — dados preenchidos automaticamente</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Razão social *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="Construtora ABC Ltda"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Telefone</label>
                      <input
                        type="text"
                        value={form.phone}
                        onChange={e => update('phone', e.target.value)}
                        placeholder="(27) 99999-0000"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => update('email', e.target.value)}
                        placeholder="contato@empresa.com.br"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5 flex-[2]">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">CNAE principal</label>
                      <input
                        type="text"
                        value={form.cnae}
                        onChange={e => update('cnae', e.target.value)}
                        placeholder="4120400"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Grau de risco</label>
                      <select
                        value={form.grau_risco}
                        onChange={e => update('grau_risco', e.target.value)}
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] transition"
                      >
                        {GRAUS.map(g => (
                          <option key={g} value={g}>Grau {g}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Endereço</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.cep}
                        onChange={e => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition pr-10"
                      />
                      {buscandoCep && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 size={16} className="animate-spin text-[var(--brand)]" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Endereço</label>
                    <input
                      type="text"
                      value={form.endereco}
                      onChange={e => update('endereco', e.target.value)}
                      placeholder="Rua, nº, complemento"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5 flex-[2]">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Cidade</label>
                      <input
                        type="text"
                        value={form.cidade}
                        onChange={e => update('cidade', e.target.value)}
                        placeholder="Vitória"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">UF</label>
                      <select
                        value={form.uf}
                        onChange={e => update('uf', e.target.value)}
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] transition"
                      >
                        <option value="">UF</option>
                        {ESTADOS_UF.map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsável */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Responsável na empresa</p>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5 flex-[2]">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Nome</label>
                      <input
                        type="text"
                        value={form.responsavel_nome}
                        onChange={e => update('responsavel_nome', e.target.value)}
                        placeholder="João da Silva"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Cargo</label>
                      <input
                        type="text"
                        value={form.responsavel_cargo}
                        onChange={e => update('responsavel_cargo', e.target.value)}
                        placeholder="Diretor"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail do responsável</label>
                    <input
                      type="email"
                      value={form.responsavel_email}
                      onChange={e => update('responsavel_email', e.target.value)}
                      placeholder="joao@empresa.com.br"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Avaliador responsável */}
              {avaliadores.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Avaliador responsável</p>
                  <select
                    value={form.avaliador_responsavel}
                    onChange={e => update('avaliador_responsavel', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] transition"
                  >
                    <option value="">Selecionar avaliador</option>
                    {avaliadores.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2"
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
