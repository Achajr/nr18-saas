'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  UserCheck,
  ShieldCheck,
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
        <section className="relative hidden lg:flex flex-col items-center justify-center px-10 py-9 text-center xl:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(29,78,216,0.20),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.88)_52%,rgba(30,64,175,0.82))]" />
          <div className="absolute inset-x-10 bottom-0 h-56 rounded-t-[48px] bg-white/8 blur-3xl" />

          <div className="relative flex justify-center">
            <div className="rounded-[20px] border border-white/18 bg-white px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.26)]">
              <Image
                src="/branding/login-logo-login.png"
                alt="NR18 Check"
                width={1080}
                height={500}
                priority
                className="h-auto w-full max-w-[390px] object-contain"
              />
            </div>
          </div>

          <div className="relative mt-8 flex max-w-2xl flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 backdrop-blur">
              <Sparkles size={16} className="text-cyan-200" />
              Plataforma operacional para consultorias
            </div>
            <h1 className="mt-6 max-w-[620px] text-4xl font-black leading-[1.08] text-white xl:text-5xl">
              Gestão técnica de vistorias NR-18 com relatórios prontos para entregar.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">
              Registre campo, acompanhe riscos, anexe evidências e gere pareceres comerciais com padrão profissional.
            </p>

            <div className="mt-9 grid w-full max-w-2xl grid-cols-3 gap-4">
              {[
                { label: 'Checklist normativo', value: 'NR 18', desc: 'Itens técnicos, evidências e criticidade.', icon: ClipboardCheck },
                { label: 'Operação por cliente', value: 'Multiempresa', desc: 'Obras, setores e responsáveis em um só fluxo.', icon: Building2 },
                { label: 'Entrega profissional', value: 'Relatórios PDF', desc: 'Parecer técnico, plano de ação e comparativos.', icon: BarChart3 },
              ].map(item => (
                <div key={item.label} className="group flex min-h-[196px] flex-col items-center justify-center rounded-[22px] border border-white/14 bg-white/[0.075] p-5 text-center shadow-[0_18px_44px_rgba(8,18,42,0.18)] backdrop-blur-xl transition hover:border-cyan-200/35 hover:bg-white/[0.105]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/12 text-cyan-200 shadow-inner shadow-white/10">
                    <item.icon size={20} />
                  </div>
                  <div className="mt-5 text-lg font-black text-white">{item.value}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100/70">{item.label}</div>
                  <p className="mt-3 max-w-[170px] text-sm leading-5 text-slate-300">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/20 px-4 py-2 text-sm font-semibold text-slate-200">
              <ShieldCheck size={16} className="text-emerald-200" />
              Fluxo completo: vistoria, evidências, reavaliação e comparativo.
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
                Acesse sua área técnica.
              </h2>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                Entre com suas credenciais para acompanhar vistorias, evidências, não conformidades e relatórios da sua consultoria.
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[0_24px_70px_rgba(15,35,71,0.12)] sm:p-8">
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

              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">Acesso criado pela consultoria</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      Use o e-mail e a senha cadastrados pelo gestor. Para solicitar acesso ou recuperar credenciais, fale com o administrador da sua consultoria.
                    </p>
                  </div>
                </div>
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
