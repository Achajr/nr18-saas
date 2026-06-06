'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'

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
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">

      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-[var(--brand)] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
          <ShieldCheck size={34} color="#E6F1FB" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Vistoria NR 18</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sistema de segurança do trabalho com IA</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Entrar na sua conta</h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition pr-11"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Entrando...</>
            ) : 'Entrar'}
          </button>

        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Primeira vez?{' '}
          <a href="/auth/register" className="text-[var(--brand)] hover:text-blue-400 font-medium transition">
            Criar conta
          </a>
        </p>
      </div>

      <p className="mt-8 text-xs text-[var(--text-muted)]">NR 18 · Portaria MTE nº 836/2026</p>
    </div>
  )
}