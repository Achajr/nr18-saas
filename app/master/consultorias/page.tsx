'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { fetchCnpjInfo, formatCnpj, formatPhone, getResponsavelFromQsa, onlyDigits } from '@/lib/cnpj'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Building2, X, Loader2,
  CheckCircle, AlertCircle, Users, FileText, Pencil
} from 'lucide-react'
import ConsultoriaLogo from '@/components/ConsultoriaLogo'

interface Consultoria {
  id: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  responsavel_nome: string | null
  responsavel_email: string | null
  logo_path: string | null
  logo_url: string | null
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
  cnpj: '',
  email: '',
  phone: '',
  responsavel_nome: '',
  responsavel_email: '',
  access_password: '',
  logo_path: '',
  logo_url: '',
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
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

  function safeFileName(name: string) {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
  }

  function handleLogoChange(file?: File | null) {
    if (!file) {
      setLogoFile(null)
      setLogoPreview(form.logo_url || '')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A logomarca deve ter no máximo 2MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function uploadLogo(consultoriaId: string) {
    if (!logoFile) return { logo_path: form.logo_path || null, logo_url: form.logo_url || null }

    const fallbackName = 'logo.png'
    const storagePath = consultoriaId + '/' + Date.now() + '-' + safeFileName(logoFile.name || fallbackName)
    const { error } = await supabase.storage
      .from('consultoria-logos')
      .upload(storagePath, logoFile, { contentType: logoFile.type })
    if (error) throw error

    const { data } = supabase.storage.from('consultoria-logos').getPublicUrl(storagePath)
    return { logo_path: storagePath, logo_url: data.publicUrl }
  }

  async function salvarAcessoGestor(consultoriaId: string) {
    if (!form.responsavel_email) return
    if (!editId && !form.access_password) return

    const res = await fetch('/api/local-admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsertConsultoriaGestor',
        consultoriaId,
        fullName: form.responsavel_nome || form.name,
        email: form.responsavel_email,
        password: form.access_password || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message || 'Erro ao salvar acesso do gestor')
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
        responsavel_nome: getResponsavelFromQsa(data) || f.responsavel_nome,
        responsavel_email: email || f.responsavel_email,
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
    setLogoFile(null)
    setLogoPreview('')
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
      logo_path: c.logo_path || '',
      logo_url: c.logo_url || '',
      access_password: '',
      plan: c.plan,
      observacoes: '',
    })
    setLogoFile(null)
    setLogoPreview(c.logo_url || '')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) { toast.error('Nome da consultoria é obrigatório'); return }
    setSaving(true)
    try {
      const plano = PLANOS.find(p => p.value === form.plan) || PLANOS[1]

      if (editId) {
        const logoData = await uploadLogo(editId)
        const { error } = await supabase
          .from('consultorias')
          .update({
            name: form.name,
            cnpj: form.cnpj || null,
            email: form.email || null,
            phone: form.phone || null,
            responsavel_nome: form.responsavel_nome || null,
            responsavel_email: form.responsavel_email || null,
            logo_path: logoData.logo_path,
            logo_url: logoData.logo_url,
            plan: form.plan,
            max_avaliadores: plano.max_avaliadores,
            max_empresas: plano.max_empresas,
            max_obras: plano.max_obras,
          })
          .eq('id', editId)
        if (error) throw error
        await salvarAcessoGestor(editId)
        toast.success('Consultoria atualizada!')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: consultoria, error } = await supabase
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
          .select()
          .single()
        if (error) throw error
        if (consultoria?.id && logoFile) {
          const logoData = await uploadLogo(consultoria.id)
          const { error: logoError } = await supabase
            .from('consultorias')
            .update(logoData)
            .eq('id', consultoria.id)
          if (logoError) throw logoError
        }
        await salvarAcessoGestor(consultoria.id)
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
    free:       'bg-slate-700 text-[var(--text-primary)]',
    pro:        'bg-blue-900 text-blue-300',
    enterprise: 'bg-purple-900 text-purple-300',
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Header */}
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

                  {/* Avatar */}
                  {c.logo_url ? (
                    <ConsultoriaLogo src={c.logo_url} name={c.name} size="md" label="" />
                  ) : (
                    <div className="w-12 h-12 bg-[var(--brand)]/20 border border-[var(--brand)]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-bold text-[var(--brand)]">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[var(--text-primary)]">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[c.plan]}`}>
                        {c.plan}
                      </span>
                      {c.active
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">Ativa</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativa</span>
                      }
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {c.cnpj && <span className="text-xs text-[var(--text-muted)]">{c.cnpj}</span>}
                      {c.email && <span className="text-xs text-[var(--text-muted)]">{c.email}</span>}
                      {c.responsavel_nome && <span className="text-xs text-[var(--text-muted)]">Resp: {c.responsavel_nome}</span>}
                    </div>
                    <div className="flex gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <Users size={13} className="text-[var(--text-muted)]" />
                        {c.plan === 'enterprise' ? 'Avaliadores ilimitados' : `${c.max_avaliadores} avaliador${c.max_avaliadores > 1 ? 'es' : ''}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <Building2 size={13} className="text-[var(--text-muted)]" />
                        {c.plan === 'enterprise' ? 'Empresas ilimitadas' : `${c.max_empresas} empresa${c.max_empresas > 1 ? 's' : ''}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <FileText size={13} className="text-[var(--text-muted)]" />
                        Vistorias ilimitadas
                      </div>
                    </div>
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

              {/* Dados */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Dados da consultoria</p>
                <div className="flex flex-col gap-3">

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
                    <p className="text-xs text-[var(--text-muted)]">Digite o CNPJ — dados preenchidos automaticamente via Receita Federal</p>
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
                </div>
              </div>

              {/* Responsável */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Responsável</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Logomarca da consultoria</label>
                    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                      <div className="h-20 w-32 overflow-hidden rounded-xl border border-[var(--border)] bg-white flex items-center justify-center">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Prévia da logomarca" className="h-full w-full object-contain p-2" />
                        ) : (
                          <span className="px-3 text-center text-xs text-[var(--text-muted)]">Sem logo</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleLogoChange(e.target.files?.[0])}
                          className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-[var(--brand-hover)]"
                        />
                        <p className="mt-2 text-xs text-[var(--text-muted)]">PNG, JPG ou SVG até 2MB. Ela aparecerá no painel e nos relatórios.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Nome</label>
                    <input
                      type="text"
                      value={form.responsavel_nome}
                      onChange={e => update('responsavel_nome', e.target.value)}
                      placeholder="Dr. João Silva"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail</label>
                    <input
                      type="email"
                      value={form.responsavel_email}
                      onChange={e => update('responsavel_email', e.target.value)}
                      placeholder="joao@consultoria.com.br"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      {editId ? 'Nova senha de acesso' : 'Senha inicial de acesso'}
                    </label>
                    <input
                      type="password"
                      value={form.access_password}
                      onChange={e => update('access_password', e.target.value)}
                      placeholder={editId ? 'Preencha apenas se quiser alterar' : 'Mínimo 6 caracteres'}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                    <p className="text-xs text-[var(--text-muted)]">
                      {editId
                        ? 'Ao preencher, a senha do gestor/responsável desta consultoria será atualizada.'
                        : 'Se preenchida, cria o acesso de gestor para o responsável da consultoria.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plano */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Plano contratado</p>
                <div className="grid grid-cols-3 gap-2">
                  {PLANOS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => update('plan', p.value)}
                      className={`py-4 px-3 rounded-xl border text-sm font-medium transition flex flex-col items-center gap-1.5 ${
                        form.plan === p.value
                          ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-white'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-slate-500'
                      }`}
                    >
                      <span className={`font-semibold ${form.plan === p.value ? 'text-[var(--text-primary)]' : p.color}`}>
                        {p.label}
                      </span>
                      <span className="text-xs font-normal text-[var(--text-muted)] text-center leading-tight">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Vistorias ilimitadas em todos os planos.
                </p>
              </div>

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
