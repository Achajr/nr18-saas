'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  Activity,
  ArrowRight,
  Building2, Users, FileText, LogOut,
  ChevronRight, TrendingUp, AlertCircle, CheckCircle2,
  Clock, XCircle, HardHat, BarChart3, AlertTriangle
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

interface Stats {
  total_avaliadores: number
  total_empresas: number
  total_obras: number
  total_vistorias: number
  vistorias_mes: number
  vistorias_concluidas: number
  vistorias_incompletas: number
  vistorias_andamento: number
  indice_medio: number
  total_ncs: number
}

interface Vistoria {
  id: string
  numero: string
  data_vistoria: string
  status: string
  indice_conformidade: number
  classificacao: string
  obra: { name: string; empresa_cliente: { name: string } | null } | null
  avaliador: { full_name: string } | null
}

interface EmpresaRanking {
  id: string
  name: string
  total_ncs: number
  total_vistorias: number
  indice_medio: number
}

interface AvaliadorStats {
  id: string
  full_name: string
  total_vistorias: number
  vistorias_mes: number
  indice_medio: number
}

function IndiceBar({ value }: { value: number }) {
  const color = value >= 90 ? 'bg-[#3B6D11]' : value >= 70 ? 'bg-[#854F0B]' : value >= 50 ? 'bg-[#A32D2D]' : 'bg-[#791F1F]'
  const textColor = value >= 90 ? 'text-[#3B6D11]' : value >= 70 ? 'text-[#854F0B]' : value >= 50 ? 'text-[#A32D2D]' : 'text-[#791F1F]'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div className={color + ' h-full rounded-full'} style={{ width: value + '%' }} />
      </div>
      <span className={'text-xs font-bold ' + textColor}>{value}%</span>
    </div>
  )
}

export default function ConsultoriaPage() {
  const router = useRouter()
  const [consultoria, setConsultoria] = useState<any>(null)
  const [avaliador, setAvaliador] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [ultimasVistorias, setUltimasVistorias] = useState<Vistoria[]>([])
  const [incompletas, setIncompletas] = useState<Vistoria[]>([])
  const [rankingEmpresas, setRankingEmpresas] = useState<EmpresaRanking[]>([])
  const [avaliadorStats, setAvaliadorStats] = useState<AvaliadorStats[]>([])
  const [evolucaoMensal, setEvolucaoMensal] = useState<{ mes: string; total: number; indice_medio: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: av } = await supabase
        .from('avaliadores')
        .select('*, consultoria:consultorias(*)')
        .eq('id', user.id).single()
      if (!av || av.role !== 'gestor') { router.push('/dashboard'); return }
      setAvaliador(av)
      setConsultoria(av.consultoria)

      const cid = av.consultoria_id

      // Stats basicas
      const [
        { count: totalAv },
        { count: totalEmp },
        { count: totalObras },
        { count: totalVist },
        { count: vstMes },
        { count: vstConcluidas },
        { count: vstIncompletas },
        { count: vstAndamento },
      ] = await Promise.all([
        supabase.from('avaliadores').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid).eq('active', true),
        supabase.from('empresas_clientes').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid).eq('active', true),
        supabase.from('obras').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid).eq('status', 'ativa'),
        supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid),
        supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid).eq('status', 'concluida'),
        supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid).eq('status', 'incompleta'),
        supabase.from('vistorias').select('*', { count: 'exact', head: true }).eq('consultoria_id', cid).eq('status', 'em_andamento'),
      ])

      // Indice medio e total NCs
      const { data: vistoriasData } = await supabase
        .from('vistorias')
        .select('indice_conformidade, total_nao_conformes')
        .eq('consultoria_id', cid)
        .eq('status', 'concluida')

      const indiceMedio = vistoriasData && vistoriasData.length > 0
        ? Math.round(vistoriasData.reduce((s, v) => s + (v.indice_conformidade || 0), 0) / vistoriasData.length * 100) / 100
        : 0
      const totalNcs = vistoriasData?.reduce((s, v) => s + (v.total_nao_conformes || 0), 0) || 0

      setStats({
        total_avaliadores: totalAv || 0,
        total_empresas: totalEmp || 0,
        total_obras: totalObras || 0,
        total_vistorias: totalVist || 0,
        vistorias_mes: vstMes || 0,
        vistorias_concluidas: vstConcluidas || 0,
        vistorias_incompletas: vstIncompletas || 0,
        vistorias_andamento: vstAndamento || 0,
        indice_medio: indiceMedio,
        total_ncs: totalNcs,
      })

      // Ultimas vistorias
      const { data: ultVist } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, status, indice_conformidade, classificacao, obra:obras(name, empresa_cliente:empresas_clientes(name)), avaliador:avaliadores(full_name)')
        .eq('consultoria_id', cid)
        .order('created_at', { ascending: false })
        .limit(8)
      setUltimasVistorias((ultVist || []) as any)

      // Incompletas
      const { data: incompl } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, status, indice_conformidade, classificacao, obra:obras(name, empresa_cliente:empresas_clientes(name)), avaliador:avaliadores(full_name)')
        .eq('consultoria_id', cid)
        .in('status', ['incompleta', 'em_andamento'])
        .order('created_at', { ascending: false })
      setIncompletas((incompl || []) as any)

      // Ranking empresas por NCs
      const { data: empNcs } = await supabase
        .from('vistorias')
        .select('total_nao_conformes, indice_conformidade, obra:obras(empresa_cliente:empresas_clientes(id, name))')
        .eq('consultoria_id', cid)
        .eq('status', 'concluida')

      if (empNcs) {
        const empMap: Record<string, any> = {}
        empNcs.forEach((v: any) => {
          const emp = v.obra?.empresa_cliente
          if (!emp) return
          if (!empMap[emp.id]) empMap[emp.id] = { id: emp.id, name: emp.name, total_ncs: 0, total_vistorias: 0, indice_sum: 0 }
          empMap[emp.id].total_ncs += v.total_nao_conformes || 0
          empMap[emp.id].total_vistorias += 1
          empMap[emp.id].indice_sum += v.indice_conformidade || 0
        })
        const ranking = Object.values(empMap)
          .map((e: any) => ({ ...e, indice_medio: Math.round(e.indice_sum / e.total_vistorias * 100) / 100 }))
          .sort((a: any, b: any) => b.total_ncs - a.total_ncs)
          .slice(0, 6)
        setRankingEmpresas(ranking as any)
      }

      // Stats por avaliador
      const { data: avsList } = await supabase
        .from('avaliadores')
        .select('id, full_name')
        .eq('consultoria_id', cid)
        .eq('active', true)

      if (avsList) {
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const avStatsArr: AvaliadorStats[] = []
        for (const av of avsList) {
          const { data: avVist } = await supabase
            .from('vistorias')
            .select('indice_conformidade, created_at')
            .eq('avaliador_id', av.id)
            .eq('status', 'concluida')
          const totalV = avVist?.length || 0
          const meV = avVist?.filter(v => v.created_at >= inicioMes).length || 0
          const indV = totalV > 0 ? Math.round(avVist!.reduce((s, v) => s + (v.indice_conformidade || 0), 0) / totalV * 100) / 100 : 0
          avStatsArr.push({ id: av.id, full_name: av.full_name, total_vistorias: totalV, vistorias_mes: meV, indice_medio: indV })
        }
        setAvaliadorStats(avStatsArr.sort((a, b) => b.total_vistorias - a.total_vistorias))
      }

      // Evolucao mensal (6 meses)
      const meses: { mes: string; total: number; indice_medio: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
        const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
        const { data: mv } = await supabase
          .from('vistorias')
          .select('indice_conformidade')
          .eq('consultoria_id', cid)
          .eq('status', 'concluida')
          .gte('data_vistoria', inicio.split('T')[0])
          .lte('data_vistoria', fim.split('T')[0])
        const total = mv?.length || 0
        const indice = total > 0 ? Math.round(mv!.reduce((s, v) => s + (v.indice_conformidade || 0), 0) / total * 100) / 100 : 0
        meses.push({ mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), total, indice_medio: indice })
      }
      setEvolucaoMensal(meses)

    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleLogout() { await supabase.auth.signOut(); window.location.href = '/auth/login' }

  const statusConfig: Record<string, { label: string; color: string }> = {
    em_andamento: { label: 'Em andamento', color: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
    incompleta:   { label: 'Incompleta',   color: 'bg-orange-500/12 text-orange-700' },
    concluida:    { label: 'Concluída',     color: 'bg-[var(--success-bg)] text-[var(--success)]' },
    assinada:     { label: 'Assinada',      color: 'bg-[var(--brand-muted)] text-[var(--brand)]' },
  }

  const maxBarMensal = Math.max(...evolucaoMensal.map(m => m.total), 1)

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-surface)]/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size="sm" title="NR18 Check" subtitle={consultoria?.name || 'Painel da consultoria'} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/consultoria/empresas')}
              className="hidden rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-black text-[var(--text-secondary)] transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] hover:text-[var(--brand)] sm:inline-flex"
            >
              Empresas
            </button>
            <button
              onClick={() => router.push('/consultoria/avaliadores')}
              className="hidden rounded-2xl bg-[var(--brand)] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--brand-muted)] transition hover:bg-[var(--brand-hover)] md:inline-flex"
            >
              Equipe
            </button>
            <button onClick={handleLogout} className="rounded-2xl border border-[var(--border)] p-3 text-[var(--text-muted)] transition hover:border-red-300 hover:text-red-500" aria-label="Sair"><LogOut size={19} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">

        {stats && (
          <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
            <div className="relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(135deg,#0f172a,var(--brand))] p-6 text-white shadow-[var(--shadow)] sm:p-8">
              <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
              <div className="relative max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-bold text-blue-50">
                  <Activity size={16} />
                  Visão executiva da operação
                </div>
                <h2 className="mt-6 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  Controle de vistorias, riscos e desempenho técnico.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50/85">
                  Acompanhe produção da equipe, obras ativas, não conformidades e evolução mensal em um painel mais claro para gestão.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => router.push('/consultoria/empresas')}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-black text-slate-950 shadow-xl transition hover:bg-blue-50"
                  >
                    Gerenciar empresas
                    <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => router.push('/consultoria/relatorios')}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 font-bold text-white transition hover:bg-white/16"
                  >
                    Ver relatórios
                    <FileText size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-[var(--brand)]">Conformidade média</div>
                  <div className={'mt-3 text-6xl font-black leading-none ' + (stats.indice_medio >= 90 ? 'text-[#3B6D11]' : stats.indice_medio >= 70 ? 'text-[#854F0B]' : stats.indice_medio >= 50 ? 'text-[#A32D2D]' : 'text-[#791F1F]')}>
                    {stats.indice_medio}%
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Baseada nas vistorias concluídas da consultoria.</p>
                </div>
                <div className="rounded-2xl bg-[var(--brand-muted)] p-3 text-[var(--brand)]">
                  <TrendingUp size={25} />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { label: 'Concluídas', val: stats.vistorias_concluidas, color: 'bg-emerald-500', icon: <CheckCircle2 size={15} className="text-emerald-500" /> },
                  { label: 'Incompletas', val: stats.vistorias_incompletas, color: 'bg-orange-500', icon: <AlertCircle size={15} className="text-orange-500" /> },
                  { label: 'Em andamento', val: stats.vistorias_andamento, color: 'bg-amber-500', icon: <Clock size={15} className="text-amber-500" /> },
                ].map(item => (
                  <div key={item.label} className="grid grid-cols-[128px_1fr_34px] items-center gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">{item.icon}{item.label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                      <div className={item.color + ' h-full rounded-full'} style={{ width: (item.val / Math.max(stats.total_vistorias, 1) * 100) + '%' }} />
                    </div>
                    <span className="text-right text-sm font-black text-[var(--text-primary)]">{item.val}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--danger-bg)] px-4 py-3 text-sm font-black text-[var(--danger)]">
                  <XCircle size={16} />
                  Total de NCs
                  <span className="ml-auto">{stats.total_ncs}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {stats && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Avaliadores', value: stats.total_avaliadores, icon: Users, tone: 'bg-violet-500/12 text-violet-600', sub: 'ativos' },
              { label: 'Empresas', value: stats.total_empresas, icon: Building2, tone: 'bg-blue-500/12 text-blue-600', sub: 'cadastradas' },
              { label: 'Obras ativas', value: stats.total_obras, icon: HardHat, tone: 'bg-amber-500/14 text-amber-700', sub: 'em andamento' },
              { label: 'Vistorias', value: stats.total_vistorias, icon: FileText, tone: 'bg-emerald-500/12 text-emerald-600', sub: stats.vistorias_mes + ' este mês' },
            ].map(item => (
              <div key={item.label} className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm">
                <div className={`mb-5 inline-flex rounded-2xl p-3 ${item.tone}`}>
                  <item.icon size={22} />
                </div>
                <div className="text-4xl font-black text-[var(--text-primary)]">{item.value}</div>
                <div className="mt-2 text-base font-bold text-[var(--text-primary)]">{item.label}</div>
                <div className="text-sm text-[var(--text-muted)]">{item.sub}</div>
              </div>
            ))}
          </section>
        )}

        {stats && (
          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow)]">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-[var(--brand)]">
                  <BarChart3 size={17} />
                  Evolução mensal
                </div>
                <h3 className="mt-1 text-2xl font-black text-[var(--text-primary)]">Vistorias dos últimos 6 meses</h3>
              </div>
              <span className="text-sm font-semibold text-[var(--text-muted)]">{stats.vistorias_mes} vistorias neste mês</span>
            </div>
            <div className="flex h-52 items-end gap-3 sm:gap-5">
              {evolucaoMensal.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="text-sm font-black text-[var(--text-primary)]">{m.total > 0 ? m.total : ''}</div>
                  <div className="flex h-32 w-full items-end overflow-hidden rounded-t-2xl bg-[var(--brand-muted)]">
                    <div
                      className="w-full rounded-t-2xl bg-[linear-gradient(180deg,var(--brand),#22c55e)] transition-all"
                      style={{ height: (m.total / maxBarMensal * 128) + 'px', minHeight: m.total > 0 ? '8px' : '0' }}
                    />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-muted)] text-center">{m.mes}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vistorias incompletas/pendentes */}
        {incompletas.length > 0 && (
          <section className="overflow-hidden rounded-[28px] border border-amber-500/25 bg-[var(--bg-surface)] shadow-[var(--shadow)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-5">
              <div className="rounded-2xl bg-amber-500/14 p-3 text-amber-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="text-sm font-black text-amber-700">Atenção operacional</div>
                <h3 className="text-2xl font-black text-[var(--text-primary)]">Vistorias pendentes ({incompletas.length})</h3>
              </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {incompletas.map(v => (
                <div key={v.id} onClick={() => router.push('/dashboard/vistorias/' + v.id)}
                  className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-[var(--bg-elevated)] sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-[var(--text-primary)] truncate">{(v.obra as any)?.empresa_cliente?.name || (v.obra as any)?.name}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusConfig[v.status]?.color}`}>{statusConfig[v.status]?.label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                      <span>{new Date(v.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span>{(v.avaliador as any)?.full_name}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="hidden text-[var(--text-muted)] sm:block" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Ranking empresas por NCs */}
          <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-5">
              <div className="rounded-2xl bg-[var(--danger-bg)] p-3 text-[var(--danger)]">
                <AlertCircle size={22} />
              </div>
              <div>
                <div className="text-sm font-black text-[var(--danger)]">Risco por cliente</div>
                <h3 className="text-xl font-black text-[var(--text-primary)]">Empresas com mais NCs</h3>
              </div>
            </div>
            {rankingEmpresas.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-muted)]">Nenhuma vistoria concluída ainda</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {rankingEmpresas.map((e, i) => (
                  <div key={e.id} className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-primary)] text-xs font-black text-[var(--text-muted)]">{i + 1}</span>
                        <span className="truncate text-base font-bold text-[var(--text-primary)]">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="rounded-full bg-[var(--danger-bg)] px-3 py-1 text-xs font-black text-[var(--danger)]">{e.total_ncs} NCs</span>
                        <span className="text-xs font-semibold text-[var(--text-muted)]">{e.total_vistorias} vist.</span>
                      </div>
                    </div>
                    <IndiceBar value={e.indice_medio} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats por avaliador */}
          <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-5">
              <div className="rounded-2xl bg-violet-500/12 p-3 text-violet-600">
                <Users size={22} />
              </div>
              <div>
                <div className="text-sm font-black text-violet-600">Equipe técnica</div>
                <h3 className="text-xl font-black text-[var(--text-primary)]">Desempenho por avaliador</h3>
              </div>
            </div>
            {avaliadorStats.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-muted)]">Nenhum avaliador encontrado</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {avaliadorStats.map(av => (
                  <div key={av.id} className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="truncate text-base font-bold text-[var(--text-primary)]">{av.full_name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">{av.total_vistorias} total</span>
                        <span className="rounded-full bg-[var(--brand-muted)] px-3 py-1 text-xs font-black text-[var(--brand)]">{av.vistorias_mes} este mês</span>
                      </div>
                    </div>
                    <IndiceBar value={av.indice_medio} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Ultimas vistorias */}
        <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--brand-muted)] p-3 text-[var(--brand)]">
                <FileText size={22} />
              </div>
              <div>
                <div className="text-sm font-black text-[var(--brand)]">Histórico recente</div>
                <h3 className="text-2xl font-black text-[var(--text-primary)]">Últimas vistorias</h3>
              </div>
            </div>
          </div>
          {ultimasVistorias.length === 0 ? (
            <div className="py-14 text-center text-sm text-[var(--text-muted)]">Nenhuma vistoria realizada ainda</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {ultimasVistorias.map(v => {
                const indice = v.indice_conformidade || 0
                const indColor = indice >= 90 ? 'text-[#3B6D11]' : indice >= 70 ? 'text-[#854F0B]' : indice >= 50 ? 'text-[#A32D2D]' : 'text-[#791F1F]'
                return (
                  <div key={v.id} onClick={() => router.push('/dashboard/vistorias/' + v.id + '/relatorio')}
                    className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-[var(--bg-elevated)] sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-[var(--text-primary)] truncate">{(v.obra as any)?.empresa_cliente?.name || (v.obra as any)?.name}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusConfig[v.status]?.color || 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>{statusConfig[v.status]?.label || v.status}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span>{new Date(v.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <span>{(v.avaliador as any)?.full_name}</span>
                        {indice > 0 && <>
                          <span className={'text-sm font-black ' + indColor}>{indice}%</span>
                          {v.classificacao && <span className={'text-sm font-semibold ' + indColor}>{v.classificacao}</span>}
                        </>}
                      </div>
                    </div>
                    <ChevronRight size={20} className="hidden text-[var(--text-muted)] sm:block" />
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
