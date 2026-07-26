'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Loader2, Mail, Pencil, Phone, Plus, Search,
  ShieldCheck, UserCog, Users, X
} from 'lucide-react'

interface Avaliador {
  id: string
  full_name: string
  email: string
  role: string
  tipo_registro: string | null
  registro_mte: string | null
  crea: string | null
  phone: string | null
  active: boolean
  vistorias?: { id: string; status: string | null }[]
}

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  active: 'true',
}

const roleLabel: Record<string, string> = {
  gestor: 'Gestor',
  avaliador: 'Avaliador',
  estagiario: 'Estagiario',
  viewer: 'Visualizacao',
}

const roleColor: Record<string, string> = {
  gestor: 'bg-purple-900/40 text-purple-300',
  avaliador: 'bg-blue-900/40 text-blue-300',
  estagiario: 'bg-amber-900/40 text-amber-300',
  viewer: 'bg-slate-700 text-[var(--text-primary)]',
}

export default function ConsultoriaAvaliadoresPage() {
  const router = useRouter()
  const [avaliadores, setAvaliadores] = useState<Avaliador[]>([])
  const [consultoriaName, setConsultoriaName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/consultoria/avaliadores')
      if (res.status === 403) { router.push('/dashboard'); return }
      if (!res.ok) { router.push('/auth/login'); return }
      const data = await res.json()
      setConsultoriaName(data.consultoria?.name || '')
      setAvaliadores(((data.avaliadores || []) as Avaliador[]).filter((avaliador) => avaliador.role !== 'gestor'))
    } finally {
      setLoading(false)
    }
  }

  function update(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function openNovo() {
    setEditId(null)
    setForm(emptyForm)
    setShowPass(false)
    setShowModal(true)
  }

  function openEdit(avaliador: Avaliador) {
    setEditId(avaliador.id)
    setForm({
      full_name: avaliador.full_name,
      email: avaliador.email,
      password: '',
      active: avaliador.active ? 'true' : 'false',
    })
    setShowPass(false)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.full_name || !form.email) {
      toast.error('Preencha nome e e-mail')
      return
    }
    if (!editId && form.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }
    if (editId && form.password && form.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/consultoria/avaliadores', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId || undefined,
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          active: form.active === 'true',
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao salvar')

      toast.success(editId ? 'Avaliador atualizado!' : 'Avaliador cadastrado!')
      setShowModal(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar avaliador')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(avaliador: Avaliador) {
    const res = await fetch('/api/consultoria/avaliadores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: avaliador.id, active: !avaliador.active }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      toast.error(data.error || 'Erro ao atualizar status')
      return
    }
    toast.success(avaliador.active ? 'Avaliador desativado' : 'Avaliador ativado')
    loadData()
  }

  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase()
    if (!termo) return avaliadores
    return avaliadores.filter((avaliador) =>
      avaliador.full_name.toLowerCase().includes(termo) ||
      avaliador.email.toLowerCase().includes(termo) ||
      (avaliador.registro_mte || '').toLowerCase().includes(termo) ||
      (avaliador.crea || '').toLowerCase().includes(termo)
    )
  }, [avaliadores, search])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/consultoria')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Avaliadores</h1>
          <p className="text-xs text-[var(--text-muted)]">{consultoriaName || 'Equipe da consultoria'}</p>
        </div>
        <button
          onClick={openNovo}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={15} />
          Novo avaliador
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
            <Users size={18} className="text-blue-400" />
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{avaliadores.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Cadastrados</div>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
            <ShieldCheck size={18} className="text-green-400" />
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{avaliadores.filter((a) => a.active).length}</div>
            <div className="text-xs text-[var(--text-muted)]">Ativos</div>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 col-span-2 sm:col-span-1">
            <UserCog size={18} className="text-purple-400" />
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{avaliadores.filter((a) => a.role === 'gestor').length}</div>
            <div className="text-xs text-[var(--text-muted)]">Gestores</div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou registro..."
            className="w-full pl-9 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[var(--brand)]" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
            <Users size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Nenhum avaliador encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtrados.map((avaliador) => {
              const totalVistorias = avaliador.vistorias?.length || 0
              const registro = avaliador.registro_mte ? `MTE ${avaliador.registro_mte}` : avaliador.crea

              return (
                <div key={avaliador.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-[var(--brand)]/20 border border-[var(--brand)]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--brand)]">
                        {avaliador.full_name.split(' ').slice(0, 2).map((name) => name[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{avaliador.full_name}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[avaliador.role] || roleColor.viewer}`}>
                          {roleLabel[avaliador.role] || avaliador.role}
                        </span>
                        {!avaliador.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativo</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Mail size={11} /> {avaliador.email}
                        </span>
                        {avaliador.phone && (
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Phone size={11} /> {avaliador.phone}
                          </span>
                        )}
                        {registro && <span className="text-xs text-[var(--text-muted)]">{registro}</span>}
                        <span className="text-xs text-[var(--text-secondary)]">{totalVistorias} vistoria{totalVistorias === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => openEdit(avaliador)}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded-lg transition"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => toggleActive(avaliador)}
                        className={`p-2 rounded-lg transition ${avaliador.active ? 'text-green-500 hover:bg-green-900/10' : 'text-red-500 hover:bg-red-900/10'}`}
                        title={avaliador.active ? 'Desativar' : 'Ativar'}
                      >
                        {avaliador.active ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text-primary)]">
                {editId ? 'Editar avaliador' : 'Novo avaliador'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Nome *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) => update('full_name', event.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail de acesso *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  placeholder="avaliador@email.com"
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  {editId ? 'Nova senha (opcional)' : 'Senha inicial *'}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => update('password', event.target.value)}
                    placeholder={editId ? 'Deixe em branco para manter a senha' : 'Mínimo 6 caracteres'}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-11 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Status</label>
                <select
                  value={form.active}
                  onChange={(event) => update('active', event.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] transition"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
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
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
