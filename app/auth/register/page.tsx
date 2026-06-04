'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const ROLES = [
  { value: 'admin',      label: 'Administrador',                        registro: null },
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
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Usuário não criado')

      // 2. Criar organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: form.org_name,
          cnpj: form.org_cnpj || null,
          plan: 'free',
        })
        .select()
        .single()
      if (orgError) throw orgError

      // 3. Criar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          organization_id: org.id,
          full_name: form.full_name,
          email: form.email,
          role: role === 'estagiario' ? 'tecnico' : role, // estagiário usa role tecnico com flag
          registro_mte: precisaMTE ? (form.registro_mte || null) : null,
          crea: precisaCREA ? (form.crea_numero ? `CREA-${creaEstado} ${form.crea_numero}` : null) : null,
        })
      if (profileError) throw profileError

      toast.success('Conta criada! Bem-vindo ao sistema.')
      router.push('/dashboard')
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
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-4 py-10">

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="w-14 h-14 bg-[#185FA5] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
          <ShieldCheck size={28} color="#E6F1FB" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Vistoria NR 18</h1>
          <p className="text-xs text-slate-400 mt-0.5">Criar sua conta</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-8 shadow-2xl">
        <form onSubmit={handleRegister} className="flex flex-col gap-5">

          {/* ── DADOS PESSOAIS ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Seus dados</p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Nome completo *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="Ex: Carlos Henrique Borges"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                />
              </div>

              {/* Função */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Função *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm focus:outline-none focus:border-[#185FA5] transition"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Registro MTE — só para TST */}
              {precisaMTE && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Registro MTE
                    <span className="text-slate-600 ml-1">(Técnico de Segurança)</span>
                  </label>
                  <div className="flex gap-2 items-center bg-[#0f1117] border border-[#2a2d4a] rounded-xl px-4 py-3 focus-within:border-[#185FA5] transition">
                    <span className="text-slate-500 text-sm font-mono whitespace-nowrap">MTE</span>
                    <div className="w-px h-4 bg-[#2a2d4a]" />
                    <input
                      type="text"
                      value={form.registro_mte}
                      onChange={e => update('registro_mte', e.target.value)}
                      placeholder="12.048/MG"
                      className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-600">Ex: MTE 12.048/MG</p>
                </div>
              )}

              {/* CREA — só para Engenheiro */}
              {precisaCREA && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    CREA
                    <span className="text-slate-600 ml-1">(Engenheiro de Segurança)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-[#0f1117] border border-[#2a2d4a] rounded-xl px-3 focus-within:border-[#185FA5] transition">
                      <span className="text-slate-500 text-sm font-mono whitespace-nowrap">CREA-</span>
                      <select
                        value={creaEstado}
                        onChange={e => setCreaEstado(e.target.value)}
                        className="bg-transparent text-white text-sm focus:outline-none py-3 cursor-pointer"
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
                      className="flex-1 px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                    />
                  </div>
                  <p className="text-xs text-slate-600">Ex: CREA-ES 145.832</p>
                </div>
              )}

              {/* Estagiário — aviso informativo */}
              {role === 'estagiario' && (
                <div className="flex items-start gap-2 bg-[#185FA5]/10 border border-[#185FA5]/30 rounded-xl px-4 py-3">
                  <span className="text-[#185FA5] text-lg leading-none mt-0.5">ℹ</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Estagiários podem realizar e salvar vistorias, mas o relatório final deve ser
                    revisado e assinado por um Técnico ou Engenheiro de Segurança responsável.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* ── DADOS DA EMPRESA ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sua empresa</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Nome da empresa *</label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={e => update('org_name', e.target.value)}
                  placeholder="Construtora Horizonte Ltda"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">CNPJ</label>
                <input
                  type="text"
                  value={form.org_cnpj}
                  onChange={e => update('org_cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                />
              </div>
            </div>
          </div>

          {/* ── ACESSO ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Acesso</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Senha *</label>
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
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#185FA5] hover:bg-[#1a6bbf] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 mt-1"
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

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem conta?{' '}
          <a href="/auth/login" className="text-[#185FA5] hover:text-blue-400 font-medium transition">
            Entrar
          </a>
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-600">NR 18 · Portaria MTE nº 836/2026</p>
    </div>
  )
}