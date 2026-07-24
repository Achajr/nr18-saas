'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const ROLES = [
  { value: 'gestor',     label: 'Gestor da consultoria',                registro: null },
  { value: 'engenheiro', label: 'Engenheiro de Segurança do Trabalho',  registro: 'crea' },
  { value: 'tecnico',    label: 'Técnico de Segurança do Trabalho',     registro: 'mte' },
  { value: 'estagiario', label: 'Estagiário de Segurança do Trabalho',  registro: null },
  { value: 'viewer',     label: 'Somente visualização',                 registro: null },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [role, setRole] = useState('tecnico')
  const [creaEstado, setCreaEstado] = useState('ES')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    org_name: '',
    org_cnpj: '',
    registro_mte: '',
    crea_numero: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Qual tipo de registro o papel atual exige
  const roleInfo = ROLES.find(r => r.value === role)
  const precisaMTE  = roleInfo?.registro === 'mte'
  const precisaCREA = roleInfo?.registro === 'crea'
  const dbRole = role === 'gestor'
    ? 'gestor'
    : role === 'estagiario'
      ? 'estagiario'
      : role === 'viewer'
        ? 'viewer'
        : 'avaliador'

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    if (!form.full_name || !form.email || !form.password || !form.org_name) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    if (form.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Usuário não criado')

      // 2. Criar consultoria no schema atual
      const { data: consultoria, error: consultoriaError } = await supabase
        .from('consultorias')
        .insert({
          name: form.org_name,
          cnpj: form.org_cnpj || null,
          email: form.email,
          responsavel_nome: form.full_name,
          responsavel_email: form.email,
          plan: 'pro',
          max_avaliadores: 5,
          max_empresas: 30,
          max_obras: 999,
          active: true,
          created_by: authData.user.id,
        })
        .select('id')
        .single()
      if (consultoriaError) throw consultoriaError

      // 3. Criar vínculo do usuário como avaliador/gestor
      const { error: avaliadorError } = await supabase
        .from('avaliadores')
        .insert({
          id: authData.user.id,
          consultoria_id: consultoria.id,
          full_name: form.full_name,
          email: form.email,
          role: dbRole,
          tipo_registro: precisaMTE ? 'mte' : precisaCREA ? 'crea' : null,
          registro_mte: precisaMTE ? (form.registro_mte || null) : null,
          crea: precisaCREA ? (form.crea_numero ? `CREA-${creaEstado} ${form.crea_numero}` : null) : null,
          active: true,
        })
      if (avaliadorError) throw avaliadorError

      toast.success('Conta criada! Bem-vindo ao sistema.')
      router.push(dbRole === 'gestor' ? '/consultoria' : '/dashboard')
    } catch (err: any) {
      console.error(err)
      if (err.message?.includes('already registered')) {
        toast.error('Este e-mail já está cadastrado')
      } else {
        toast.error(err.message || 'Erro ao criar conta')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 py-10">

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <BrandLogo size="lg" subtitle="Criar sua conta" className="flex-col text-center" />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl">
        <form onSubmit={handleRegister} className="flex flex-col gap-5">

          {/* ── DADOS PESSOAIS ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Seus dados</p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Nome completo *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="Ex: Carlos Henrique Borges"
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                />
              </div>

              {/* Função */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Função *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] transition"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Registro MTE — só para TST */}
              {precisaMTE && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Registro MTE
                    <span className="text-[var(--text-muted)] ml-1">(Técnico de Segurança)</span>
                  </label>
                  <div className="flex gap-2 items-center bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 focus-within:border-[var(--brand)] transition">
                    <span className="text-[var(--text-muted)] text-sm font-mono whitespace-nowrap">MTE</span>
                    <div className="w-px h-4 bg-[var(--border)]" />
                    <input
                      type="text"
                      value={form.registro_mte}
                      onChange={e => update('registro_mte', e.target.value)}
                      placeholder="12.048/MG"
                      className="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Ex: MTE 12.048/MG</p>
                </div>
              )}

              {/* CREA — só para Engenheiro */}
              {precisaCREA && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    CREA
                    <span className="text-[var(--text-muted)] ml-1">(Engenheiro de Segurança)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 focus-within:border-[var(--brand)] transition">
                      <span className="text-[var(--text-muted)] text-sm font-mono whitespace-nowrap">CREA-</span>
                      <select
                        value={creaEstado}
                        onChange={e => setCreaEstado(e.target.value)}
                        className="bg-transparent text-[var(--text-primary)] text-sm focus:outline-none py-3 cursor-pointer"
                      >
                        {ESTADOS.map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={form.crea_numero}
                      onChange={e => update('crea_numero', e.target.value)}
                      placeholder="145.832"
                      className="flex-1 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Ex: CREA-ES 145.832</p>
                </div>
              )}

              {/* Estagiário — aviso informativo */}
              {role === 'estagiario' && (
                <div className="flex items-start gap-2 bg-[var(--brand)]/10 border border-[var(--brand)]/30 rounded-xl px-4 py-3">
                  <span className="text-[var(--brand)] text-lg leading-none mt-0.5">ℹ</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Estagiários podem realizar e salvar vistorias, mas o relatório final deve ser
                    revisado e assinado por um Técnico ou Engenheiro de Segurança responsável.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* ── DADOS DA EMPRESA ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Sua empresa</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Nome da empresa *</label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={e => update('org_name', e.target.value)}
                  placeholder="Construtora Horizonte Ltda"
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">CNPJ</label>
                <input
                  type="text"
                  value={form.org_cnpj}
                  onChange={e => update('org_cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                />
              </div>
            </div>
          </div>

          {/* ── ACESSO ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Acesso</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Senha *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar conta'
            )}
          </button>

        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Já tem conta?{' '}
          <a href="/auth/login" className="text-[var(--brand)] hover:text-blue-400 font-medium transition">
            Entrar
          </a>
        </p>
      </div>

      <p className="mt-6 text-xs text-[var(--text-muted)]">NR 18 · Portaria MTE nº 836/2026</p>
    </div>
  )
}
