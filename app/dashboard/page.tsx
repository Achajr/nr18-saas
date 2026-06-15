'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  HardHat,
  LogOut,
  Plus,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

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

interface RawVistoria extends Omit<Vistoria, 'obra'> {
  obra:
    | Vistoria['obra']
    | {
        name: string
        empresa_cliente: { name: string }[] | { name: string } | null
      }[]
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function normalizeVistoria(row: RawVistoria): Vistoria {
  const obra = firstOrNull(row.obra)
  const empresaCliente = firstOrNull(obra?.empresa_cliente)

  return {
    ...row,
    obra: obra
      ? {
          name: obra.name,
          empresa_cliente: empresaCliente ? { name: empresaCliente.name } : null,
        }
      : null,
  }
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
      setVistorias(((vists || []) as unknown as RawVistoria[]).map(normalizeVistoria))

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
    em_andamento: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    concluida:    'bg-[var(--success-bg)] text-[var(--success)]',
    assinada:     'bg-[var(--brand-muted)] text-[var(--brand)]',
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

  const primeiroNome = avaliador?.full_name?.split(' ')[0] || 'Avaliador'
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-surface)]/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size="sm" subtitle={avaliador?.consultoria?.name || 'Vistorias e conformidade'} />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-right sm:block">
              <div className="text-sm font-bold text-[var(--text-primary)]">{avaliador?.full_name}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {avaliador?.registro_mte ? `MTE ${avaliador.registro_mte}` : avaliador?.crea || 'Avaliador'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-2xl border border-[var(--border)] p-3 text-[var(--text-muted)] transition hover:border-red-300 hover:text-red-500"
              aria-label="Sair"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--brand),#0f172a)] p-6 text-white shadow-[var(--shadow)] sm:p-8">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_65%_35%,rgba(255,255,255,0.26),transparent_34%)]" />
            <div className="relative max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-bold text-blue-50">
                <CalendarDays size={16} />
                {dataHoje}
              </div>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                Olá, {primeiroNome}. Sua operação de campo está pronta.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50/85">
                Inicie uma vistoria, acompanhe conformidade e mantenha o histórico técnico da consultoria em ordem.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => router.push('/dashboard/obras/nova')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-black text-slate-950 shadow-xl transition hover:bg-blue-50"
                >
                  <Plus size={20} />
                  Nova vistoria NR 18
                </button>
                <button
                  onClick={() => router.push('/dashboard/relatorios')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 font-bold text-white transition hover:bg-white/16"
                >
                  Ver relatórios
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--brand-muted)] p-3 text-[var(--brand)]">
                <HardHat size={24} />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-muted)]">Resumo rápido</div>
                <div className="text-2xl font-black text-[var(--text-primary)]">{stats?.vistorias_mes || 0} no mês</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Empresas ativas', value: stats?.total_empresas || 0 },
                { label: 'Vistorias totais', value: stats?.total_vistorias || 0 },
                { label: 'NCs abertas', value: stats?.ncs_abertas || 0 },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-[var(--bg-primary)] px-4 py-3">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">{item.label}</span>
                  <span className="text-lg font-black text-[var(--text-primary)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {stats && (
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Empresas', value: stats.total_empresas, icon: Building2, tone: 'bg-blue-500/12 text-blue-600', sub: 'clientes vinculados' },
              { label: 'Vistorias', value: stats.total_vistorias, icon: ClipboardCheck, tone: 'bg-violet-500/12 text-violet-600', sub: 'histórico técnico' },
              { label: 'Este mês', value: stats.vistorias_mes, icon: TrendingUp, tone: 'bg-emerald-500/12 text-emerald-600', sub: 'produção recente' },
              { label: 'NCs abertas', value: stats.ncs_abertas, icon: AlertCircle, tone: 'bg-amber-500/14 text-amber-700', sub: 'pontos de atenção' },
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

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-4">
            <button
              onClick={() => router.push('/dashboard/empresas')}
              className="group flex w-full items-center gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)]/50 hover:shadow-[var(--shadow)]"
            >
              <div className="rounded-2xl bg-blue-500/12 p-4 text-blue-600">
                <Building2 size={25} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-[var(--text-primary)]">Empresas e obras</div>
                <div className="text-sm text-[var(--text-muted)]">{stats?.total_empresas || 0} empresas disponíveis para vistoria</div>
              </div>
              <ChevronRight size={20} className="text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
            </button>

            <button
              onClick={() => router.push('/dashboard/relatorios')}
              className="group flex w-full items-center gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)]/50 hover:shadow-[var(--shadow)]"
            >
              <div className="rounded-2xl bg-violet-500/12 p-4 text-violet-600">
                <FileText size={25} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-[var(--text-primary)]">Relatórios técnicos</div>
                <div className="text-sm text-[var(--text-muted)]">{stats?.total_vistorias || 0} vistorias registradas</div>
              </div>
              <ChevronRight size={20} className="text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
            </button>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--success-bg)] p-3 text-[var(--success)]">
                  <BadgeCheck size={22} />
                </div>
                <div>
                  <div className="text-lg font-black text-[var(--text-primary)]">Próximo passo</div>
                  <div className="text-sm text-[var(--text-muted)]">Revise evidências antes de concluir</div>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-[var(--bg-primary)]">
                <div className="h-full w-3/4 rounded-full bg-[var(--brand)]" />
              </div>
            </div>
          </aside>

          <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--brand)]">
                  <Activity size={17} />
                  Histórico recente
                </div>
                <h3 className="mt-1 text-2xl font-black text-[var(--text-primary)]">Últimas vistorias</h3>
              </div>
              <button
                onClick={() => router.push('/dashboard/relatorios')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-black text-[var(--brand)] transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
              >
                Ver todas <ArrowRight size={16} />
              </button>
            </div>

            {vistorias.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bg-primary)] text-[var(--text-muted)]">
                  <Clock size={32} />
                </div>
                <p className="text-base font-bold text-[var(--text-primary)]">Nenhuma vistoria realizada ainda</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Comece criando a primeira vistoria NR 18.</p>
                <button
                  onClick={() => router.push('/dashboard/obras/nova')}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 font-black text-white transition hover:bg-[var(--brand-hover)]"
                >
                  <Plus size={18} />
                  Iniciar primeira vistoria
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {vistorias.map(v => (
                  <div
                    key={v.id}
                    className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-[var(--bg-elevated)] sm:grid-cols-[1fr_auto] sm:items-center"
                    onClick={() => router.push(`/dashboard/vistorias/${v.id}`)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-[var(--text-primary)]">
                          {v.obra?.empresa_cliente?.name || v.obra?.name || 'Vistoria ' + v.numero}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusColor[v.status] || statusColor.em_andamento}`}>
                          {statusLabel[v.status] || v.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span>{new Date(v.data_vistoria).toLocaleDateString('pt-BR')}</span>
                        {v.indice_conformidade > 0 && (
                          <span className={`font-bold ${classColor[v.classificacao || ''] || 'text-[var(--text-secondary)]'}`}>
                            {v.indice_conformidade}% - {v.classificacao}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="hidden text-[var(--text-muted)] sm:block" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}
