'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha e-mail e senha')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login')) {
          toast.error('E-mail ou senha incorretos')
        } else {
          toast.error(error.message)
        }
        return
      }

      const userId = data.user.id

      // 1. Verifica se é master admin
      const { data: master } = await supabase
        .from('master_admins')
        .select('id')
        .eq('id', userId)
        .single()

      if (master) {
        toast.success('Bem-vindo, Master!')
        window.location.href = '/master'
        return
      }

      // 2. Verifica se é avaliador/gestor
      const { data: avaliador } = await supabase
        .from('avaliadores')
        .select('role')
        .eq('id', userId)
        .single()

      if (avaliador?.role === 'gestor') {
        toast.success('Bem-vindo!')
        window.location.href = '/consultoria'
        return
      }

      if (avaliador) {
        toast.success('Bem-vindo!')
        window.location.href = '/dashboard'
        return
      }

      // Fallback
      toast.error('Usuário não encontrado. Contate o administrador.')
      await supabase.auth.signOut()

    } catch (err) {
      console.error('ERRO:', err)
      toast.error('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] overflow-hidden">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden lg:flex flex-col justify-between px-12 py-10 xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(29,78,216,0.20),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.88)_52%,rgba(30,64,175,0.82))]" />
          <div className="absolute inset-x-10 bottom-0 h-56 rounded-t-[48px] bg-white/8 blur-3xl" />

          <div className="relative flex justify-center">
            <div className="rounded-[24px] border border-white/18 bg-white px-3 py-2 shadow-[0_22px_58px_rgba(0,0,0,0.30)]">
              <Image
                src="/branding/login-logo-login.png"
                alt="NR18 Check"
                width={1080}
                height={500}
                priority
                className="h-auto w-full max-w-[620px] object-contain"
              />
            </div>
          </div>

          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 backdrop-blur">
              <Sparkles size={16} className="text-cyan-200" />
              Plataforma operacional para consultorias
            </div>
            <h1 className="mt-8 text-5xl font-black leading-[1.02] text-white xl:text-6xl">
              Vistorias, não conformidades e relatórios em um fluxo mais claro.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Uma experiência pensada para equipes que precisam registrar campo, acompanhar risco e entregar relatórios técnicos com mais velocidade.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { label: 'Conformidade', value: 'NR 18', icon: ClipboardCheck },
                { label: 'Empresas', value: 'Multi-cliente', icon: Building2 },
                { label: 'Relatórios', value: 'Com IA', icon: BarChart3 },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
                  <item.icon size={20} className="text-cyan-200" />
                  <div className="mt-4 text-2xl font-black text-white">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-300">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-[28px] border border-white/14 bg-white/10 p-5 text-white backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-sm text-slate-300">Prévia do fluxo</div>
                <div className="text-lg font-bold">Checklist de obra em andamento</div>
              </div>
              <div className="rounded-full bg-emerald-400/16 px-3 py-1 text-sm font-bold text-emerald-200">82%</div>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_120px] gap-4">
              <div className="space-y-3">
                {['Proteção coletiva validada', 'Frentes de serviço mapeadas', 'Evidências fotográficas anexadas'].map((text, index) => (
                  <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3">
                    <CheckCircle2 size={18} className={index === 2 ? 'text-amber-200' : 'text-emerald-200'} />
                    <span className="text-sm text-slate-100">{text}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-slate-950/35 p-4">
                <div className="text-xs text-slate-400">Pendências</div>
                <div className="mt-2 text-4xl font-black">6</div>
                <div className="mt-6 h-2 rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-cyan-300" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[470px]">
            <div className="mb-8 lg:hidden flex justify-center">
              <div className="rounded-[22px] border border-[var(--border)] bg-white px-2.5 py-2 shadow-[0_14px_32px_rgba(0,0,0,0.16)]">
                <Image
                  src="/branding/login-logo-login.png"
                  alt="NR18 Check"
                  width={1080}
                  height={500}
                  priority
                  className="h-auto w-full max-w-[380px] object-contain"
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--brand)] shadow-sm">
                <ClipboardCheck size={15} />
                Acesso seguro
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Entre para continuar sua operação.
              </h2>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                Acesse vistorias, empresas, evidências e relatórios da sua consultoria.
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow)] sm:p-8">
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[var(--text-secondary)]">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
            />
          </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[var(--text-secondary)]">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 pr-12 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              >
                      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--brand)] px-5 py-4 text-base font-black text-white shadow-lg shadow-[var(--brand-muted)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Entrando...</>
                  ) : (
                    <>Entrar no sistema <ArrowRight size={19} /></>
                  )}
          </button>

        </form>

              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--text-muted)]">Primeira vez na plataforma?</p>
                <a href="/auth/register" className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)] transition hover:text-[var(--brand-hover)]">
                  Criar conta <ArrowRight size={15} />
                </a>
              </div>
            </div>

            <p className="mt-7 text-sm text-[var(--text-muted)]">
              NR 18 - Portaria MTE nº 836/2026
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
