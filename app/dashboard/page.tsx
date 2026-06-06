'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ShieldCheck, Building2, FileText, Plus,
  LogOut, ChevronRight, Clock, CheckCircle,
  AlertCircle, TrendingUp
} from 'lucide-react'

interface Avaliador {
  id: string
  full_name: string
  role: string
  registro_mte: string | null
  crea: string | null
  consultoria_id: string
  consultoria: { name: string }
}

interface Stats {
  total_empresas: number
  total_vistorias: number
  vistorias_mes: number
  ncs_abertas: number
}

interface Vistoria {
  id: string
  numero: string
  data_vistoria: string
  status: string
  indice_conformidade: number
  classificacao: string | null
  obra: { name: string; empresa_cliente: { name: string } | null } | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [avaliador, setAvaliador] = useState<Avaliador | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [vistorias, setVistorias] = useState<Vistoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: av } = await supabase
        .from('avaliadores')
        .select('*, consultoria:consultorias(name)')
        .eq('id', user.id)
        .single()

      if (!av) { router.push('/auth/login'); return }
      setAvaliador(av)

      const cid = av.consultoria_id

      // Stats
      const [
        { count: totalEmps },
        { count: totalVist },
      ] = await Promise.all([
        supabase.from('empresas_clientes').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid),
        supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('avaliador_id', user.id),
      ])

      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      const { count: totalMes } = await supabase
        .from('vistorias')
        .select('*', { count: 'exact', head: true })
        .eq('avaliador_id', user.id)
        .gte('created_at', inicioMes.toISOString())

      setStats({
        total_empresas: totalEmps || 0,
        total_vistorias: totalVist || 0,
        vistorias_mes: totalMes || 0,
        ncs_abertas: 0,
      })

      // Últimas vistorias
      const { data: vists } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, status, indice_conformidade, classificacao, obra:obras(name, empresa_cliente:empresas_clientes(name))')
        .eq('avaliador_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setVistorias(vists || [])

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const classColor: Record<string, string> = {
    'Satisfatório':              'text-green-400',
    'Parcialmente satisfatório': 'text-amber-400',
    'Insatisfatório':            'text-orange-400',
    'Crítico':                   'text-red-400',
  }

  const statusColor: Record<string, string> = {
    em_andamento: 'bg-amber-900/40 text-amber-300',
    concluida:    'bg-green-900/40 text-green-300',
    assinada:     'bg-blue-900/40 text-blue-300',
  }

  const statusLabel: Record<string, string> = {
    em_andamento: 'Em andamento',
    concluida:    'Concluída',
    assinada:     'Assinada',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--brand)] rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} color="#E6F1FB" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)]">Vistoria NR 18</h1>
            <p className="text-xs text-[var(--text-muted)] truncate max-w-[160px]">
              {avaliador?.consultoria?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-[var(--text-primary)]">{avaliador?.full_name}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {avaliador?.registro_mte ? `MTE ${avaliador.registro_mte}` : avaliador?.crea || ''}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-[var(--text-muted)] hover:text-red-400 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Boas-vindas */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Olá, {avaliador?.full_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Empresas',      value: stats.total_empresas,  icon: Building2,   color: 'text-blue-400'   },
              { label: 'Vistorias',     value: stats.total_vistorias, icon: FileText,    color: 'text-purple-400' },
              { label: 'Este mês',      value: stats.vistorias_mes,   icon: TrendingUp,  color: 'text-green-400'  },
              { label: 'NCs abertas',   value: stats.ncs_abertas,     icon: AlertCircle, color: 'text-amber-400'  },
            ].map((s, i) => (
              <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
                <s.icon size={18} className={s.color} />
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{s.value}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Botão nova vistoria */}
        <button
          onClick={() => router.push('/dashboard/obras/nova')}
          className="w-full py-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-semibold rounded-2xl transition flex items-center justify-center gap-3 mb-6 shadow-lg shadow-[var(--brand-muted)]"
        >
          <Plus size={20} />
          Nova vistoria NR 18
        </button>

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => router.push('/dashboard/empresas')}
            className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--brand)]/50 rounded-2xl p-4 flex items-center gap-3 transition group text-left"
          >
            <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-900/50 transition">
              <Building2 size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="font-medium text-[var(--text-primary)] text-sm">Empresas</div>
              <div className="text-xs text-[var(--text-muted)]">{stats?.total_empresas || 0} ativas</div>
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard/relatorios')}
            className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--brand)]/50 rounded-2xl p-4 flex items-center gap-3 transition group text-left"
          >
            <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-900/50 transition">
              <FileText size={18} className="text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-[var(--text-primary)] text-sm">Relatórios</div>
              <div className="text-xs text-[var(--text-muted)]">{stats?.total_vistorias || 0} vistorias</div>
            </div>
          </button>
        </div>

        {/* Últimas vistorias */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Últimas vistorias</h3>
            <button
              onClick={() => router.push('/dashboard/relatorios')}
              className="text-xs text-[var(--brand)] hover:text-blue-400 transition"
            >
              Ver todas
            </button>
          </div>

          {vistorias.length === 0 ? (
            <div className="py-12 text-center">
              <Clock size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-[var(--text-muted)] text-sm">Nenhuma vistoria realizada ainda</p>
              <button
                onClick={() => router.push('/dashboard/obras/nova')}
                className="mt-3 px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-xl hover:bg-[var(--brand-hover)] transition"
              >
                Iniciar primeira vistoria
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {vistorias.map(v => (
                <div
                  key={v.id}
                  className="px-5 py-4 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition cursor-pointer"
                  onClick={() => router.push(`/dashboard/vistorias/${v.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--text-primary)] text-sm">
                        {v.obra?.empresa_cliente?.name || v.obra?.name || 'Vistoria ' + v.numero}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[v.status] || statusColor.em_andamento}`}>
                        {statusLabel[v.status] || v.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(v.data_vistoria).toLocaleDateString('pt-BR')}
                      </span>
                      {v.indice_conformidade > 0 && (
                        <>
                          <span className="text-xs text-[var(--text-muted)]">·</span>
                          <span className={`text-xs font-medium ${classColor[v.classificacao || ''] || 'text-[var(--text-secondary)]'}`}>
                            {v.indice_conformidade}% — {v.classificacao}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}