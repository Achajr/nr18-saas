'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ShieldCheck, Building2, Users, FileText,
  Plus, LogOut, ChevronRight, CheckCircle,
  AlertCircle, TrendingUp, UserCog
} from 'lucide-react'

interface Consultoria {
  id: string
  name: string
  plan: string
  max_avaliadores: number
  max_empresas: number
}

interface Stats {
  total_avaliadores: number
  total_empresas: number
  total_obras: number
  total_vistorias: number
  vistorias_mes: number
}

interface Empresa {
  id: string
  name: string
  cnpj: string | null
  cidade: string | null
  uf: string | null
  active: boolean
  avaliador?: { full_name: string }
}

export default function ConsultoriaPage() {
  const router = useRouter()
  const [consultoria, setConsultoria] = useState<Consultoria | null>(null)
  const [avaliador, setAvaliador] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: av } = await supabase
      .from('avaliadores')
      .select('*, consultoria:consultorias(*)')
      .eq('id', user.id)
      .single()

    if (!av || av.role !== 'gestor') {
      router.push('/dashboard')
      return
    }

    setAvaliador(av)
    setConsultoria(av.consultoria)

    const cid = av.consultoria_id  // ← usa variável local, não o state

    // Empresas
    const { data: emps } = await supabase
      .from('empresas_clientes')
      .select('*, avaliador:avaliadores(full_name)')
      .eq('consultoria_id', cid)
      .order('created_at', { ascending: false })
      .limit(5)
    setEmpresas(emps || [])

    // Stats
    const [
      { count: totalAval },
      { count: totalEmps },
      { count: totalObras },
      { count: totalVist },
    ] = await Promise.all([
      supabase.from('avaliadores').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid),
      supabase.from('empresas_clientes').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid),
      supabase.from('obras').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid),
      supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid),
    ])

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    const { count: totalMes } = await supabase
      .from('vistorias')
      .select('*', { count: 'exact', head: true })
      .eq('consultoria_id', cid)
      .gte('created_at', inicioMes.toISOString())

    setStats({
      total_avaliadores: totalAval || 0,
      total_empresas: totalEmps || 0,
      total_obras: totalObras || 0,
      total_vistorias: totalVist || 0,
      vistorias_mes: totalMes || 0,
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
    free:       'bg-slate-700 text-slate-300',
    pro:        'bg-blue-900 text-blue-300',
    enterprise: 'bg-purple-900 text-purple-300',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* Header */}
      <header className="bg-[#16192a] border-b border-[#2a2d4a] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#185FA5] rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} color="#E6F1FB" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-[200px]">
              {consultoria?.name || 'Consultoria'}
            </h1>
            <p className="text-xs text-slate-500">Painel da Consultoria</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">
            {avaliador?.full_name}
          </span>
          {consultoria && (
            <span className={`text-xs px-2 py-1 rounded-lg border ${
              consultoria.plan === 'enterprise' ? 'bg-purple-900/50 text-purple-300 border-purple-800' :
              consultoria.plan === 'pro' ? 'bg-blue-900/50 text-blue-300 border-blue-800' :
              'bg-slate-700/50 text-slate-300 border-slate-600'
            }`}>
              {consultoria.plan}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-red-400 transition"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Boas-vindas */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Olá, {avaliador?.full_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-400 mt-1">
            Painel de gestão — {consultoria?.name}
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Avaliadores',    value: stats.total_avaliadores, icon: Users,      color: 'text-purple-400' },
              { label: 'Empresas',       value: stats.total_empresas,    icon: Building2,  color: 'text-blue-400'   },
              { label: 'Obras',          value: stats.total_obras,       icon: TrendingUp, color: 'text-amber-400'  },
              { label: 'Vistorias',      value: stats.total_vistorias,   icon: FileText,   color: 'text-cyan-400'   },
              { label: 'Este mês',       value: stats.vistorias_mes,     icon: CheckCircle,color: 'text-green-400'  },
            ].map((s, i) => (
              <div key={i} className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl p-4">
                <s.icon size={20} className={s.color} />
                <div className="text-2xl font-bold text-white mt-2">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Atalhos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => router.push('/consultoria/avaliadores')}
            className="bg-[#16192a] border border-[#2a2d4a] hover:border-[#185FA5]/50 rounded-2xl p-5 flex items-center gap-4 transition group text-left"
          >
            <div className="w-12 h-12 bg-purple-900/30 border border-purple-800/50 rounded-xl flex items-center justify-center group-hover:bg-purple-900/50 transition">
              <UserCog size={22} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">Avaliadores</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {stats?.total_avaliadores || 0} cadastrados ·
                {consultoria?.plan === 'enterprise' ? ' Ilimitados' :
                 consultoria?.plan === 'pro' ? ' até 5' : ' até 1'}
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition" />
          </button>

          <button
            onClick={() => router.push('/consultoria/empresas')}
            className="bg-[#16192a] border border-[#2a2d4a] hover:border-[#185FA5]/50 rounded-2xl p-5 flex items-center gap-4 transition group text-left"
          >
            <div className="w-12 h-12 bg-blue-900/30 border border-blue-800/50 rounded-xl flex items-center justify-center group-hover:bg-blue-900/50 transition">
              <Building2 size={22} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">Empresas clientes</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {stats?.total_empresas || 0} cadastradas ·
                {consultoria?.plan === 'enterprise' ? ' Ilimitadas' :
                 consultoria?.plan === 'pro' ? ' até 30' : ' até 1'}
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition" />
          </button>
        </div>

        {/* Últimas empresas */}
        <div className="bg-[#16192a] border border-[#2a2d4a] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2d4a] flex items-center justify-between">
            <h3 className="font-semibold text-white">Empresas clientes</h3>
            <button
              onClick={() => router.push('/consultoria/empresas')}
              className="flex items-center gap-2 px-4 py-2 bg-[#185FA5] hover:bg-[#1a6bbf] text-white text-sm font-medium rounded-xl transition"
            >
              <Plus size={15} />
              Nova empresa
            </button>
          </div>

          {empresas.length === 0 ? (
            <div className="py-14 text-center">
              <Building2 size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Nenhuma empresa cadastrada ainda</p>
              <button
                onClick={() => router.push('/consultoria/empresas')}
                className="mt-4 px-4 py-2 bg-[#185FA5] text-white text-sm rounded-xl hover:bg-[#1a6bbf] transition"
              >
                Cadastrar primeira empresa
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2d4a]">
              {empresas.map(e => (
                <div
                  key={e.id}
                  onClick={() => router.push('/consultoria/empresas')}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-[#1a1d2e] transition cursor-pointer"
                >
                  <div className="w-10 h-10 bg-[#185FA5]/20 border border-[#185FA5]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#185FA5]">
                      {e.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm truncate">{e.name}</span>
                      {!e.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativa</span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      {e.cnpj && <span className="text-xs text-slate-500">{e.cnpj}</span>}
                      {e.cidade && <span className="text-xs text-slate-500">{e.cidade}/{e.uf}</span>}
                      {e.avaliador && <span className="text-xs text-slate-600">· {e.avaliador.full_name}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}