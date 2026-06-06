'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ShieldCheck, Building2, Users, FileText, LogOut,
  ChevronRight, TrendingUp, AlertCircle, CheckCircle2,
  Clock, XCircle, HardHat, BarChart3, AlertTriangle
} from 'lucide-react'

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
    em_andamento: { label: 'Em andamento', color: 'bg-amber-900/40 text-amber-300' },
    incompleta:   { label: 'Incompleta',   color: 'bg-orange-900/40 text-orange-300' },
    concluida:    { label: 'Concluída',     color: 'bg-green-900/40 text-green-300' },
    assinada:     { label: 'Assinada',      color: 'bg-blue-900/40 text-blue-300' },
  }

  const maxBarMensal = Math.max(...evolucaoMensal.map(m => m.total), 1)

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--brand)] rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} color="#E6F1FB" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-primary)]">{consultoria?.name}</h1>
              <p className="text-xs text-[var(--text-muted)]">Painel da Consultoria — {avaliador?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/consultoria/empresas')} className="px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-slate-500 rounded-xl transition">Empresas</button>
            <button onClick={handleLogout} className="p-2 text-[var(--text-muted)] hover:text-red-400 transition"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Stats principais */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Avaliadores', value: stats.total_avaliadores, icon: Users, color: 'text-purple-400', sub: 'ativos' },
              { label: 'Empresas', value: stats.total_empresas, icon: Building2, color: 'text-blue-400', sub: 'cadastradas' },
              { label: 'Obras ativas', value: stats.total_obras, icon: HardHat, color: 'text-amber-400', sub: 'em andamento' },
              { label: 'Vistorias', value: stats.total_vistorias, icon: FileText, color: 'text-green-400', sub: stats.vistorias_mes + ' este mês' },
            ].map((s, i) => (
              <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
                <s.icon size={18} className={s.color} />
                <div className="text-3xl font-bold text-[var(--text-primary)] mt-2">{s.value}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Indice medio + Status */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Indice medio geral */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[var(--brand)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Indice Medio de Conformidade</h3>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className={'text-5xl font-bold ' + (stats.indice_medio >= 90 ? 'text-[#3B6D11]' : stats.indice_medio >= 70 ? 'text-[#854F0B]' : stats.indice_medio >= 50 ? 'text-[#A32D2D]' : 'text-[#791F1F]')}>
                    {stats.indice_medio}%
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">média geral da consultoria</div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Concluídas', val: stats.vistorias_concluidas, color: 'bg-green-500', icon: <CheckCircle2 size={12} className="text-green-400" /> },
                    { label: 'Incompletas', val: stats.vistorias_incompletas, color: 'bg-orange-500', icon: <AlertCircle size={12} className="text-orange-400" /> },
                    { label: 'Em andamento', val: stats.vistorias_andamento, color: 'bg-amber-500', icon: <Clock size={12} className="text-amber-400" /> },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {s.icon}
                      <span className="text-xs text-[var(--text-secondary)] w-24">{s.label}</span>
                      <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div className={s.color + ' h-full rounded-full'} style={{ width: (s.val / Math.max(stats.total_vistorias, 1) * 100) + '%' }} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)] w-6 text-right">{s.val}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <XCircle size={12} className="text-red-400" />
                    <span className="text-xs text-[var(--text-secondary)]">Total de NCs</span>
                    <span className="text-xs font-bold text-red-400 ml-auto">{stats.total_ncs}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Evolucao mensal */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-[var(--brand)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Vistorias — Últimos 6 Meses</h3>
              </div>
              <div className="flex items-end gap-2 h-24">
                {evolucaoMensal.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-[var(--text-muted)]">{m.total > 0 ? m.total : ''}</div>
                    <div className="w-full rounded-t-lg bg-[var(--brand)]/20 flex items-end justify-center" style={{ height: '60px' }}>
                      <div className="w-full rounded-t-lg bg-[var(--brand)] transition-all" style={{ height: (m.total / maxBarMensal * 60) + 'px', minHeight: m.total > 0 ? '4px' : '0' }} />
                    </div>
                    <div className="text-xs text-[var(--text-muted)] text-center">{m.mes}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vistorias incompletas/pendentes */}
        {incompletas.length > 0 && (
          <div className="bg-[var(--bg-surface)] border border-amber-500/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Vistorias Pendentes ({incompletas.length})</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {incompletas.map(v => (
                <div key={v.id} onClick={() => router.push('/dashboard/vistorias/' + v.id)}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">{(v.obra as any)?.empresa_cliente?.name || (v.obra as any)?.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[v.status]?.color}`}>{statusConfig[v.status]?.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[var(--text-muted)]">{new Date(v.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <span className="text-xs text-[var(--text-muted)]">{(v.avaliador as any)?.full_name}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Ranking empresas por NCs */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Empresas com Mais NCs</h3>
            </div>
            {rankingEmpresas.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">Nenhuma vistoria concluída ainda</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {rankingEmpresas.map((e, i) => (
                  <div key={e.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[var(--text-muted)] font-mono w-4">{i + 1}.</span>
                        <span className="text-sm text-[var(--text-primary)] truncate">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-red-400 font-bold">{e.total_ncs} NCs</span>
                        <span className="text-xs text-[var(--text-muted)]">{e.total_vistorias} vist.</span>
                      </div>
                    </div>
                    <IndiceBar value={e.indice_medio} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats por avaliador */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Desempenho por Avaliador</h3>
            </div>
            {avaliadorStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">Nenhum avaliador encontrado</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {avaliadorStats.map(av => (
                  <div key={av.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-[var(--text-primary)] truncate">{av.full_name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-[var(--text-secondary)]">{av.total_vistorias} total</span>
                        <span className="text-xs text-[var(--brand)] font-medium">{av.vistorias_mes} este mês</span>
                      </div>
                    </div>
                    <IndiceBar value={av.indice_medio} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ultimas vistorias */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--brand)]" />
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Últimas Vistorias</h3>
            </div>
          </div>
          {ultimasVistorias.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">Nenhuma vistoria realizada ainda</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {ultimasVistorias.map(v => {
                const indice = v.indice_conformidade || 0
                const indColor = indice >= 90 ? 'text-[#3B6D11]' : indice >= 70 ? 'text-[#854F0B]' : indice >= 50 ? 'text-[#A32D2D]' : 'text-[#791F1F]'
                return (
                  <div key={v.id} onClick={() => router.push('/dashboard/vistorias/' + v.id + '/relatorio')}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{(v.obra as any)?.empresa_cliente?.name || (v.obra as any)?.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[v.status]?.color || 'bg-slate-700 text-[var(--text-secondary)]'}`}>{statusConfig[v.status]?.label || v.status}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-[var(--text-muted)]">{new Date(v.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <span className="text-xs text-[var(--text-muted)]">·</span>
                        <span className="text-xs text-[var(--text-muted)]">{(v.avaliador as any)?.full_name}</span>
                        {indice > 0 && <>
                          <span className="text-xs text-[var(--text-muted)]">·</span>
                          <span className={'text-xs font-bold ' + indColor}>{indice}%</span>
                          {v.classificacao && <span className={'text-xs ' + indColor}>{v.classificacao}</span>}
                        </>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
