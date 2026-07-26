'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCnpjInfo, formatCep, formatCnpj, formatEndereco, formatPhone, getResponsavelFromQsa, onlyDigits } from '@/lib/cnpj'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Building2, X, Loader2,
  CheckCircle, AlertCircle, Pencil, Mail, MapPin, Phone
} from 'lucide-react'
import Image from 'next/image'

interface Consultoria {
  id: string
  name: string
  logoUrl: string | null
  logo_url?: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  endereco: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  responsavel_nome: string | null
  responsavel_email: string | null
  plan: string
  max_avaliadores: number
  max_empresas: number
  max_obras: number
  active: boolean
  login_email: string | null
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
    color: 'text-[var(--text-primary)]',
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
  logo_url: '',
  cnpj: '',
  email: '',
  phone: '',
  endereco: '',
  cidade: '',
  uf: '',
  cep: '',
  responsavel_nome: '',
  responsavel_email: '',
  login_email: '',
  login_password: '',
  plan: 'pro',
  active: 'true',
  observacoes: '',
}

const ESTADOS_UF = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

export default function ConsultoriasPage() {
  const router = useRouter()
  const [consultorias, setConsultorias] = useState<Consultoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)

  useEffect(() => { loadConsultorias() }, [])

  async function loadConsultorias() {
    try {
      const res = await fetch('/api/consultorias')
      const data = await res.json()
      setConsultorias(data.consultorias || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function getLogo(c: Consultoria) {
    return c.logoUrl || c.logo_url || ''
  }

  function updateLogoFile(file: File | null) {
    setLogoFile(file)
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setLogoPreview(file ? URL.createObjectURL(file) : '')
  }

  async function buscarCnpj(cnpj: string) {
    const numeros = onlyDigits(cnpj)
    if (numeros.length !== 14) return
    setBuscandoCnpj(true)
    try {
      const data = await fetchCnpjInfo(numeros)
      if (!data) return
      const email = data.email ? data.email.toLowerCase() : ''
      setForm(f => ({
        ...f,
        cnpj: formatCnpj(numeros),
        name: data.razao_social || f.name,
        email: email || f.email,
        phone: formatPhone(data.ddd_telefone_1) || formatPhone(data.ddd_telefone_2) || f.phone,
        endereco: formatEndereco(data) || f.endereco,
        cidade: data.municipio || f.cidade,
        uf: data.uf || f.uf,
        cep: formatCep(data.cep) || f.cep,
        responsavel_nome: getResponsavelFromQsa(data) || f.responsavel_nome,
        responsavel_email: email || f.responsavel_email,
        login_email: email || f.login_email,
      }))
      toast.success('Dados da consultoria preenchidos!')
    } catch {
      toast.error('Erro ao consultar CNPJ')
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

  function openNova() {
    setEditId(null)
    setForm(emptyForm)
    updateLogoFile(null)
    setShowModal(true)
  }

  function openEdit(c: Consultoria) {
    setEditId(c.id)
    setForm({
      name: c.name,
      logo_url: c.logo_url || '',
      cnpj: c.cnpj || '',
      email: c.email || '',
      phone: c.phone || '',
      endereco: c.endereco || '',
      cidade: c.cidade || '',
      uf: c.uf || '',
      cep: c.cep || '',
      responsavel_nome: c.responsavel_nome || '',
      responsavel_email: c.responsavel_email || '',
      login_email: c.login_email || c.responsavel_email || c.email || '',
      login_password: '',
      plan: c.plan,
      active: c.active ? 'true' : 'false',
      observacoes: '',
    })
    updateLogoFile(null)
    setLogoPreview(getLogo(c))
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) { toast.error('Nome da consultoria é obrigatório'); return }
    if (!form.cnpj) { toast.error('CNPJ é obrigatório'); return }
    if (!form.login_email) { toast.error('E-mail de login é obrigatório'); return }
    if (!editId && form.login_password.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return }
    if (editId && form.login_password && form.login_password.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return }
    setSaving(true)
    try {
      const selectedPlan = PLANOS.find(plano => plano.value === form.plan) || PLANOS[1]
      const payload = new FormData()
      payload.append('id', editId || '')
      payload.append('name', form.name)
      payload.append('cnpj', form.cnpj)
      payload.append('email', form.email)
      payload.append('phone', form.phone)
      payload.append('endereco', form.endereco)
      payload.append('cidade', form.cidade)
      payload.append('uf', form.uf)
      payload.append('cep', form.cep)
      payload.append('responsavel_nome', form.responsavel_nome)
      payload.append('responsavel_email', form.responsavel_email)
      payload.append('login_email', form.login_email)
      payload.append('login_password', form.login_password)
      payload.append('plan', form.plan)
      payload.append('max_avaliadores', String(selectedPlan.max_avaliadores))
      payload.append('max_empresas', String(selectedPlan.max_empresas))
      payload.append('max_obras', String(selectedPlan.max_obras))
      payload.append('active', form.active)
      if (logoFile) payload.append('logo', logoFile)

      const res = await fetch('/api/consultorias', {
        method: 'POST',
        body: payload
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao salvar')

      toast.success(editId ? 'Consultoria atualizada!' : 'Consultoria cadastrada!')
      setShowModal(false)
      updateLogoFile(null)
      loadConsultorias()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Consultoria) {
    try {
      await fetch('/api/consultorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, active: !c.active })
      })
      toast.success(c.active ? 'Consultoria desativada' : 'Consultoria ativada')
      loadConsultorias()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const planColors: Record<string, string> = {
    free:       'bg-slate-700 text-[var(--text-primary)]',
    pro:        'bg-blue-900 text-blue-300',
    enterprise: 'bg-purple-900 text-purple-300',
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push('/master')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Gerenciar Consultorias</h1>
          <p className="text-xs text-[var(--text-muted)]">Painel Master</p>
        </div>
        <button
          onClick={openNova}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={15} />
          Nova consultoria
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[var(--brand)]" />
          </div>
        ) : consultorias.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="text-slate-700 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">Nenhuma consultoria cadastrada</p>
            <button
              onClick={openNova}
              className="mt-4 px-6 py-2.5 bg-[var(--brand)] text-white text-sm rounded-xl hover:bg-[var(--brand-hover)] transition"
            >
              Cadastrar primeira consultoria
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {consultorias.map(c => (
              <div key={c.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar / Logomarca */}
                  <div className="relative w-12 h-12 bg-white border border-[var(--border)] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                    {getLogo(c) ? (
                      <Image src={getLogo(c)} alt={c.name} fill className="object-contain p-1" />
                    ) : (
                      <span className="text-base font-bold text-[var(--brand)]">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[var(--text-primary)]">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[c.plan] || planColors.pro}`}>
                        {c.plan}
                      </span>
                      {c.active
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">Ativa</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativa</span>
                      }
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {c.cnpj && <span className="text-xs text-[var(--text-muted)]">{c.cnpj}</span>}
                      {c.cidade && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <MapPin size={10} /> {c.cidade}/{c.uf}
                        </span>
                      )}
                      {c.email && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Mail size={10} /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Phone size={10} /> {c.phone}
                        </span>
                      )}
                    </div>
                    {c.responsavel_nome && (
                      <div className="mt-1.5">
                        <span className="text-xs text-[var(--text-muted)]">Responsável: </span>
                        <span className="text-xs text-[var(--text-secondary)]">{c.responsavel_nome}</span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded-lg transition"
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
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)]">
              <h2 className="font-semibold text-[var(--text-primary)]">
                {editId ? 'Editar consultoria' : 'Nova consultoria'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Dados da consultoria</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">CNPJ *</label>
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
                    <p className="text-xs text-[var(--text-muted)]">Digite o CNPJ para preencher razão social, endereço e responsável automaticamente.</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Razão social *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="Consultoria SST Brasil Ltda"
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
                        placeholder="contato@consultoria.com.br"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Logomarca</label>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-16 w-16 shrink-0 rounded-xl border border-[var(--border)] bg-white bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: logoPreview ? `url("${logoPreview}")` : undefined }}
                      />
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => updateLogoFile(e.target.files?.[0] || null)}
                          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:outline-none focus:border-[var(--brand)] transition"
                        />
                        <p className="mt-1 text-xs text-[var(--text-muted)]">PNG, JPG ou SVG até 3MB. Será exibida no cabeçalho e nos relatórios.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Endereço</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">CEP</label>
                      <input
                        type="text"
                        value={form.cep}
                        onChange={e => update('cep', formatCep(e.target.value))}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
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

                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Plano da consultoria</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {PLANOS.map(plano => {
                      const selected = form.plan === plano.value
                      return (
                        <button
                          key={plano.value}
                          type="button"
                          onClick={() => update('plan', plano.value)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected
                              ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm'
                              : 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--brand)]/50'
                          }`}
                        >
                          <div className={`text-sm font-black ${plano.color}`}>{plano.label}</div>
                          <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{plano.desc}</div>
                          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {plano.max_obras >= 9999 ? 'Obras ilimitadas' : `${plano.max_obras} obras`}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Responsável e status</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Responsável</label>
                      <input
                        type="text"
                        value={form.responsavel_nome}
                        onChange={e => update('responsavel_nome', e.target.value)}
                        placeholder="Nome do responsável"
                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail do responsável</label>
                        <input
                          type="email"
                          value={form.responsavel_email}
                          onChange={e => update('responsavel_email', e.target.value)}
                          placeholder="responsavel@consultoria.com.br"
                          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs font-medium text-[var(--text-secondary)]">Status</label>
                        <select
                          value={form.active}
                          onChange={e => update('active', e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] transition"
                        >
                          <option value="true">Ativa</option>
                          <option value="false">Inativa</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Acesso da consultoria</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail de login *</label>
                    <input
                      type="email"
                      value={form.login_email}
                      onChange={e => update('login_email', e.target.value)}
                      placeholder="login@consultoria.com.br"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      {editId ? 'Nova senha (opcional)' : 'Senha inicial *'}
                    </label>
                    <input
                      type="password"
                      value={form.login_password}
                      onChange={e => update('login_password', e.target.value)}
                      placeholder={editId ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>
                </div>
              </div>

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
