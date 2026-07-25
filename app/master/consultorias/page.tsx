'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCnpjInfo, formatCnpj, formatPhone, getResponsavelFromQsa, onlyDigits } from '@/lib/cnpj'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Building2, X, Loader2,
  CheckCircle, AlertCircle, Users, FileText, Pencil, Image as ImageIcon
} from 'lucide-react'
import Image from 'next/image'

interface Consultoria {
  id: string
  name: string
  logo_url: string | null
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
      const res = await fetch('/api/consultorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId || undefined,
          name: form.name,
          logoUrl: form.logo_url || null,
          active: true
        })
      })

      if (!res.ok) throw new Error('Erro ao salvar')

      toast.success(editId ? 'Consultoria atualizada!' : 'Consultoria cadastrada!')
      setShowModal(false)
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
                    {c.logo_url ? (
                      <Image src={c.logo_url} alt={c.name} fill className="object-contain p-1" />
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
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Razão social *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="Consultoria SST Brasil Ltda"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">URL da Logomarca (Imagem)</label>
                    <input
                      type="text"
                      value={form.logo_url}
                      onChange={e => update('logo_url', e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                      className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                    <p className="text-xs text-[var(--text-muted)]">A logomarca será exibida no cabeçalho e nos relatórios PDF técnicos.</p>
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
