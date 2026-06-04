'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, User, X, Loader2,
  CheckCircle, AlertCircle, Pencil, Eye, EyeOff
} from 'lucide-react'

interface Consultoria {
  id: string
  name: string
  plan: string
}

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
  created_at: string
  consultoria_id: string
  consultoria?: { name: string }
}

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const ROLES = [
  { value: 'gestor',     label: 'Gestor da consultoria',              registro: null   },
  { value: 'avaliador',  label: 'Técnico de Segurança do Trabalho',   registro: 'mte'  },
  { value: 'avaliador',  label: 'Engenheiro de Segurança do Trabalho', registro: 'crea' },
  { value: 'estagiario', label: 'Estagiário de Segurança do Trabalho', registro: null  },
  { value: 'viewer',     label: 'Somente visualização',               registro: null   },
]

// Sem duplicatas no select
const ROLES_UNICOS = [
  { value: 'gestor',     label: 'Gestor da consultoria',               tipo: null    },
  { value: 'tst',        label: 'Técnico de Segurança do Trabalho',    tipo: 'mte'   },
  { value: 'eng',        label: 'Engenheiro de Segurança do Trabalho', tipo: 'crea'  },
  { value: 'estagiario', label: 'Estagiário de Segurança do Trabalho', tipo: null    },
  { value: 'viewer',     label: 'Somente visualização',                tipo: null    },
]

const emptyForm = {
  consultoria_id: '',
  full_name: '',
  email: '',
  password: '',
  role_key: 'tst',
  tipo_registro: 'mte' as string | null,
  registro_mte: '',
  crea_numero: '',
  crea_estado: 'ES',
  phone: '',
}

export default function Avaliadores() {
  const router = useRouter()
  const [avaliadores, setAvaliadores] = useState<Avaliador[]>([])
  const [consultorias, setConsultorias] = useState<Consultoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPass, setShowPass] = useState(false)
  const [filtroConsultoria, setFiltroConsultoria] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: avs }, { data: cons }] = await Promise.all([
      supabase
        .from('avaliadores')
        .select('*, consultoria:consultorias(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('consultorias')
        .select('id, name, plan')
        .eq('active', true)
        .order('name'),
    ])
    setAvaliadores(avs || [])
    setConsultorias(cons || [])
    setLoading(false)
  }

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function selectRole(roleKey: string) {
    const r = ROLES_UNICOS.find(x => x.value === roleKey)
    setForm(f => ({
      ...f,
      role_key: roleKey,
      tipo_registro: r?.tipo || null,
      registro_mte: '',
      crea_numero: '',
    }))
  }

  function openNova() {
    setEditId(null)
    setForm({
      ...emptyForm,
      consultoria_id: consultorias[0]?.id || '',
    })
    setShowModal(true)
  }

  function openEdit(a: Avaliador) {
    setEditId(a.id)
    setForm({
      consultoria_id: a.consultoria_id,
      full_name: a.full_name,
      email: a.email,
      password: '',
      role_key: a.role,
      tipo_registro: a.tipo_registro,
      registro_mte: a.registro_mte || '',
      crea_numero: a.crea ? a.crea.split(' ')[1] || '' : '',
      crea_estado: a.crea ? a.crea.split('-')[1]?.split(' ')[0] || 'ES' : 'ES',
      phone: a.phone || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.full_name || !form.email || !form.consultoria_id) {
      toast.error('Preencha nome, e-mail e consultoria')
      return
    }
    if (!editId && form.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }
    setSaving(true)
    try {
      const roleMap: Record<string, string> = {
        gestor: 'gestor', tst: 'avaliador', eng: 'avaliador',
        estagiario: 'estagiario', viewer: 'viewer',
      }
      const dbRole = roleMap[form.role_key] || 'avaliador'
      const crea = form.tipo_registro === 'crea' && form.crea_numero
        ? `CREA-${form.crea_estado} ${form.crea_numero}`
        : null

      if (editId) {
        // Atualiza dados do avaliador
        const { error } = await supabase
          .from('avaliadores')
          .update({
            full_name: form.full_name,
            consultoria_id: form.consultoria_id,
            role: dbRole,
            tipo_registro: form.tipo_registro,
            registro_mte: form.tipo_registro === 'mte' ? form.registro_mte || null : null,
            crea,
            phone: form.phone || null,
          })
          .eq('id', editId)
        if (error) throw error
        toast.success('Avaliador atualizado!')
      } else {
        // 1. Cria usuário no Auth via Supabase Admin (precisamos de service_role)
        // Por ora usamos signUp — em produção usar Admin API no servidor
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } }
        })
        if (authError) throw authError
        if (!authData.user) throw new Error('Usuário não criado')

        // 2. Cria registro do avaliador
        const { error: avError } = await supabase
          .from('avaliadores')
          .insert({
            id: authData.user.id,
            consultoria_id: form.consultoria_id,
            full_name: form.full_name,
            email: form.email,
            role: dbRole,
            tipo_registro: form.tipo_registro,
            registro_mte: form.tipo_registro === 'mte' ? form.registro_mte || null : null,
            crea,
            phone: form.phone || null,
            active: true,
          })
        if (avError) throw avError
        toast.success('Avaliador cadastrado! Ele receberá o e-mail de confirmação.')
      }
      setShowModal(false)
      loadData()
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        toast.error('Este e-mail já está cadastrado no sistema')
      } else {
        toast.error(err.message || 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(a: Avaliador) {
    const { error } = await supabase
      .from('avaliadores')
      .update({ active: !a.active })
      .eq('id', a.id)
    if (error) { toast.error('Erro ao atualizar'); return }
    toast.success(a.active ? 'Avaliador desativado' : 'Avaliador ativado')
    loadData()
  }

  const roleLabel: Record<string, string> = {
    gestor: 'Gestor', avaliador: 'Avaliador',
    estagiario: 'Estagiário', viewer: 'Visualizador',
  }

  const roleColor: Record<string, string> = {
    gestor:     'bg-purple-900/40 text-purple-300',
    avaliador:  'bg-blue-900/40 text-blue-300',
    estagiario: 'bg-amber-900/40 text-amber-300',
    viewer:     'bg-slate-700 text-slate-300',
  }

  const avFiltrados = filtroConsultoria
    ? avaliadores.filter(a => a.consultoria_id === filtroConsultoria)
    : avaliadores

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* Header */}
      <header className="bg-[#16192a] border-b border-[#2a2d4a] px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push('/master')} className="p-2 text-slate-400 hover:text-white transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white">Gerenciar Avaliadores</h1>
          <p className="text-xs text-slate-500">Painel Master</p>
        </div>
        <button
          onClick={openNova}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#185FA5] hover:bg-[#1a6bbf] text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={15} />
          Novo avaliador
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Filtro por consultoria */}
        {consultorias.length > 1 && (
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFiltroConsultoria('')}
                className={`px-4 py-2 rounded-xl text-sm transition border ${
                  filtroConsultoria === ''
                    ? 'bg-[#185FA5] border-[#185FA5] text-white'
                    : 'border-[#2a2d4a] text-slate-400 hover:border-slate-500'
                }`}
              >
                Todas
              </button>
              {consultorias.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFiltroConsultoria(c.id)}
                  className={`px-4 py-2 rounded-xl text-sm transition border ${
                    filtroConsultoria === c.id
                      ? 'bg-[#185FA5] border-[#185FA5] text-white'
                      : 'border-[#2a2d4a] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[#185FA5]" />
          </div>
        ) : avFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <User size={48} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">Nenhum avaliador cadastrado</p>
            <button
              onClick={openNova}
              className="mt-4 px-6 py-2.5 bg-[#185FA5] text-white text-sm rounded-xl hover:bg-[#1a6bbf] transition"
            >
              Cadastrar primeiro avaliador
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {avFiltrados.map(a => (
              <div key={a.id} className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#185FA5]/20 border border-[#185FA5]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#185FA5]">
                      {a.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm">{a.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[a.role] || roleColor.avaliador}`}>
                        {roleLabel[a.role] || a.role}
                      </span>
                      {!a.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      <span className="text-xs text-slate-500">{a.email}</span>
                      {a.registro_mte && <span className="text-xs text-slate-500">MTE {a.registro_mte}</span>}
                      {a.crea && <span className="text-xs text-slate-500">{a.crea}</span>}
                      {a.consultoria && (
                        <span className="text-xs text-slate-600">· {a.consultoria.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-[#2a2d4a] rounded-lg transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => toggleActive(a)}
                      className={`p-2 rounded-lg transition ${a.active
                        ? 'text-green-400 hover:bg-green-900/20'
                        : 'text-red-400 hover:bg-red-900/20'}`}
                    >
                      {a.active ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
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
                {editId ? 'Editar avaliador' : 'Novo avaliador'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">

              {/* Consultoria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Consultoria *</label>
                <select
                  value={form.consultoria_id}
                  onChange={e => update('consultoria_id', e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm focus:outline-none focus:border-[#185FA5] transition"
                >
                  <option value="">Selecione a consultoria</option>
                  {consultorias.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Dados pessoais */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dados pessoais</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Nome completo *</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={e => update('full_name', e.target.value)}
                      placeholder="Carlos Henrique Borges"
                      className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                    />
                  </div>

                  {/* Função */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Função *</label>
                    <select
                      value={form.role_key}
                      onChange={e => selectRole(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm focus:outline-none focus:border-[#185FA5] transition"
                    >
                      {ROLES_UNICOS.map(r => (
                        <option key={r.value + r.tipo} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Registro MTE */}
                  {form.tipo_registro === 'mte' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-400">Registro MTE</label>
                      <div className="flex gap-2 items-center bg-[#0f1117] border border-[#2a2d4a] rounded-xl px-4 py-3 focus-within:border-[#185FA5] transition">
                        <span className="text-slate-500 text-sm font-mono">MTE</span>
                        <div className="w-px h-4 bg-[#2a2d4a]" />
                        <input
                          type="text"
                          value={form.registro_mte}
                          onChange={e => update('registro_mte', e.target.value)}
                          placeholder="12.048/MG"
                          className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* CREA */}
                  {form.tipo_registro === 'crea' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-400">CREA</label>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 bg-[#0f1117] border border-[#2a2d4a] rounded-xl px-3 focus-within:border-[#185FA5] transition">
                          <span className="text-slate-500 text-sm font-mono">CREA-</span>
                          <select
                            value={form.crea_estado}
                            onChange={e => update('crea_estado', e.target.value)}
                            className="bg-transparent text-white text-sm focus:outline-none py-3 cursor-pointer"
                          >
                            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={form.crea_numero}
                          onChange={e => update('crea_numero', e.target.value)}
                          placeholder="145.832"
                          className="flex-1 px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* Estagiário — aviso */}
                  {form.role_key === 'estagiario' && (
                    <div className="flex items-start gap-2 bg-[#185FA5]/10 border border-[#185FA5]/30 rounded-xl px-4 py-3">
                      <span className="text-[#185FA5] text-base leading-none mt-0.5">ℹ</span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Estagiários podem realizar vistorias, mas o relatório deve ser
                        revisado e assinado por um Técnico ou Engenheiro responsável.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Telefone</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="(27) 99999-0000"
                      className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Acesso — só para novo cadastro */}
              {!editId && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Acesso ao sistema</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-400">E-mail *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => update('email', e.target.value)}
                        placeholder="avaliador@email.com"
                        className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-400">Senha provisória *</label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => update('password', e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                        >
                          {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600">O avaliador poderá alterar a senha após o primeiro acesso.</p>
                    </div>
                  </div>
                </div>
              )}

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