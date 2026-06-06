'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ShieldCheck, Building2, Users, FileText,
  TrendingUp, Plus, LogOut, ChevronRight,
  CheckCircle, AlertCircle, UserCog
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Stats {
  total_consultorias: number
  consultorias_ativas: number
  total_avaliadores: number
  total_obras: number
  total_vistorias: number
}

interface Consultoria {
  id: string
  name: string
  cnpj: string | null
  plan: string
  active: boolean
  max_avaliadores: number
  max_empresas: number
  created_at: string
}

export default function MasterPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [consultorias, setConsultorias] = useState<Consultoria[]>([])
  const [loading, setLoading] = useState(true)
  const [masterName, setMasterName] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: master } = await supabase
        .from('master_admins')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (master) setMasterName(master.full_name)

      const { data: cons } = await supabase
        .from('consultorias')
        .select('*')
        .order('created_at', { ascending: false })
      setConsultorias(cons || [])

      const { count: totalAval } = await supabase
        .from('avaliadores')
        .select('*', { count: 'exact', head: true })

      const { count: totalObras } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true })

      const { count: totalVist } = await supabase
        .from('vistorias')
        .select('*', { count: 'exact', head: true })

      setStats({
        total_consultorias: cons?.length || 0,
        consultorias_ativas: cons?.filter(c => c.active).length || 0,
        total_avaliadores: totalAval || 0,
        total_obras: totalObras || 0,
        total_vistorias: totalVist || 0,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const planColors: Record<string, string> = {
    free:       'bg-slate-700 text-[var(--text-primary)]',
    pro:        'bg-blue-900 text-blue-300',
    enterprise: 'bg-purple-900 text-purple-300',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Carregando painel master...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--brand)] rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} color="#E6F1FB" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)]">Vistoria NR 18</h1>
            <p className="text-xs text-[var(--text-muted)]">Painel Master</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)] hidden sm:block">{masterName}</span>
          <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded-lg border border-purple-800">
            Master Admin
          </span>
          <button
            onClick={handleLogout}
            className="p-2 text-[var(--text-muted)] hover:text-red-400 transition"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Boas-vindas */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Olá, {masterName.split(' ')[0]} 👋
          </h2>
          <p className="text-[var(--text-secondary)] mt-1">
            Visão geral de todas as consultorias do sistema
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Consultorias',  value: stats.total_consultorias,  icon: Building2,   color: 'text-blue-400'   },
              { label: 'Ativas',        value: stats.consultorias_ativas,  icon: CheckCircle, color: 'text-green-400'  },
              { label: 'Avaliadores',   value: stats.total_avaliadores,    icon: Users,       color: 'text-purple-400' },
              { label: 'Obras',         value: stats.total_obras,          icon: TrendingUp,  color: 'text-amber-400'  },
              { label: 'Vistorias',     value: stats.total_vistorias,      icon: FileText,    color: 'text-cyan-400'   },
            ].map((s, i) => (
              <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
                <s.icon size={20} className={s.color} />
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{s.value}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Atalhos de navegação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => router.push('/master/consultorias')}
            className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--brand)]/50 rounded-2xl p-5 flex items-center gap-4 transition group text-left"
          >
            <div className="w-12 h-12 bg-blue-900/30 border border-blue-800/50 rounded-xl flex items-center justify-center group-hover:bg-[var(--brand)]/20 transition">
              <Building2 size={22} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)]">Consultorias</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {stats?.total_consultorias || 0} cadastradas · Gerenciar planos e acesso
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition" />
          </button>

          <button
            onClick={() => router.push('/master/avaliadores')}
            className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--brand)]/50 rounded-2xl p-5 flex items-center gap-4 transition group text-left"
          >
            <div className="w-12 h-12 bg-purple-900/30 border border-purple-800/50 rounded-xl flex items-center justify-center group-hover:bg-purple-900/40 transition">
              <UserCog size={22} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)]">Avaliadores</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {stats?.total_avaliadores || 0} cadastrados · Gerenciar técnicos e acessos
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition" />
          </button>
        </div>

        {/* Lista de consultorias */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Consultorias cadastradas</h3>
            <button
              onClick={() => router.push('/master/consultorias')}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-medium rounded-xl transition"
            >
              <Plus size={15} />
              Nova consultoria
            </button>
          </div>

          {consultorias.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-[var(--text-muted)] text-sm">Nenhuma consultoria cadastrada ainda</p>
              <button
                onClick={() => router.push('/master/consultorias')}
                className="mt-4 px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-xl hover:bg-[var(--brand-hover)] transition"
              >
                Cadastrar primeira consultoria
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {consultorias.map(c => (
                <div
                  key={c.id}
                  onClick={() => router.push('/master/consultorias')}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-[var(--bg-elevated)] transition cursor-pointer"
                >
                  <div className="w-10 h-10 bg-[var(--brand)]/20 border border-[var(--brand)]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--brand)]">
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--text-primary)] text-sm">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[c.plan] || planColors.free}`}>
                        {c.plan}
                      </span>
                      {!c.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">Inativa</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[var(--text-muted)]">{c.cnpj || 'CNPJ não informado'}</span>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {c.plan === 'enterprise' ? 'Ilimitado' : `${c.max_avaliadores} aval. · ${c.max_empresas} emp.`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.active
                      ? <CheckCircle size={16} className="text-green-400" />
                      : <AlertCircle size={16} className="text-red-400" />
                    }
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}