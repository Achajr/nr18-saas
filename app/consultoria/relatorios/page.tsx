'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ArrowLeft, BarChart3, Building2, CalendarDays,
  ChevronRight, FileText, Loader2, Search, Users
} from 'lucide-react'

interface Vistoria {
  id: string
  numero: string
  data_vistoria: string
  status: string
  indice_conformidade: number | null
  classificacao: string | null
  total_nao_conformes: number | null
  obra: {
    name: string
    empresa_cliente: { name: string } | null
  } | null
  avaliador: { full_name: string } | null
}

interface RawVistoria extends Omit<Vistoria, 'obra' | 'avaliador'> {
  obra:
    | Vistoria['obra']
    | {
        name: string
        empresa_cliente: { name: string }[] | { name: string } | null
      }[]
  avaliador: Vistoria['avaliador'] | { full_name: string }[]
}

const statusConfig: Record<string, { label: string; color: string }> = {
  incompleta: { label: 'Incompleta', color: 'bg-orange-900/40 text-orange-300' },
  em_andamento: { label: 'Em andamento', color: 'bg-amber-900/40 text-amber-300' },
  concluida: { label: 'Concluida', color: 'bg-green-900/40 text-green-300' },
  assinada: { label: 'Assinada', color: 'bg-blue-900/40 text-blue-300' },
}

function formatDate(value: string) {
  return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR')
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function normalizeVistoria(row: RawVistoria): Vistoria {
  const obra = firstOrNull(row.obra)
  const empresaCliente = firstOrNull(obra?.empresa_cliente)
  const avaliador = firstOrNull(row.avaliador)

  return {
    ...row,
    obra: obra
      ? {
          name: obra.name,
          empresa_cliente: empresaCliente ? { name: empresaCliente.name } : null,
        }
      : null,
    avaliador: avaliador ? { full_name: avaliador.full_name } : null,
  }
}

export default function ConsultoriaRelatoriosPage() {
  const router = useRouter()
  const [vistorias, setVistorias] = useState<Vistoria[]>([])
  const [consultoriaName, setConsultoriaName] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: av } = await supabase
        .from('avaliadores')
        .select('consultoria_id, role, consultoria:consultorias(name)')
        .eq('id', user.id)
        .single()

      if (!av) {
        router.push('/auth/login')
        return
      }

      if (av.role !== 'gestor') {
        router.push('/dashboard/relatorios')
        return
      }

      const consultoria = Array.isArray(av.consultoria)
        ? av.consultoria[0]
        : av.consultoria
      setConsultoriaName(consultoria?.name || '')

      const { data } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, status, indice_conformidade, classificacao, total_nao_conformes, obra:obras(name, empresa_cliente:empresas_clientes(name)), avaliador:avaliadores(full_name)')
        .eq('consultoria_id', av.consultoria_id)
        .order('created_at', { ascending: false })

      setVistorias(((data || []) as unknown as RawVistoria[]).map(normalizeVistoria))
    } finally {
      setLoading(false)
    }
  }

  const filtradas = useMemo(() => {
    const termo = search.trim().toLowerCase()
    return vistorias.filter((vistoria) => {
      const empresa = vistoria.obra?.empresa_cliente?.name || vistoria.obra?.name || ''
      const avaliador = vistoria.avaliador?.full_name || ''
      const matchesSearch = !termo ||
        empresa.toLowerCase().includes(termo) ||
        avaliador.toLowerCase().includes(termo) ||
        vistoria.numero.toLowerCase().includes(termo)
      const matchesStatus = status === 'todos' || vistoria.status === status
      return matchesSearch && matchesStatus
    })
  }, [search, status, vistorias])

  const stats = useMemo(() => {
    const concluidas = vistorias.filter((vistoria) => vistoria.status === 'concluida' || vistoria.status === 'assinada')
    const empresas = new Set(vistorias.map((vistoria) => vistoria.obra?.empresa_cliente?.name).filter(Boolean))
    const avaliadores = new Set(vistorias.map((vistoria) => vistoria.avaliador?.full_name).filter(Boolean))
    const media = concluidas.length
      ? Math.round(concluidas.reduce((sum, vistoria) => sum + (vistoria.indice_conformidade || 0), 0) / concluidas.length)
      : 0

    return {
      total: vistorias.length,
      abertas: vistorias.filter((vistoria) => ['incompleta', 'em_andamento'].includes(vistoria.status)).length,
      empresas: empresas.size,
      avaliadores: avaliadores.size,
      media,
    }
  }, [vistorias])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/consultoria')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Relatórios da consultoria</h1>
          <p className="text-xs text-[var(--text-muted)]">{consultoriaName || 'Todas as vistorias'}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Vistorias', value: stats.total, icon: FileText, color: 'text-blue-400' },
            { label: 'Abertas', value: stats.abertas, icon: CalendarDays, color: 'text-amber-400' },
            { label: 'Empresas', value: stats.empresas, icon: Building2, color: 'text-green-400' },
            { label: 'Avaliadores', value: stats.avaliadores, icon: Users, color: 'text-purple-400' },
            { label: 'Media', value: stats.media ? `${stats.media}%` : '-', icon: BarChart3, color: 'text-cyan-400' },
          ].map((item) => (
            <div key={item.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
              <item.icon size={17} className={item.color} />
              <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{item.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por empresa, avaliador ou numero..."
              className="w-full pl-9 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] transition"
          >
            <option value="todos">Todos os status</option>
            <option value="em_andamento">Em andamento</option>
            <option value="incompleta">Incompleta</option>
            <option value="concluida">Concluida</option>
            <option value="assinada">Assinada</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[var(--brand)]" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
            <FileText size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Nenhuma vistoria encontrada</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="divide-y divide-[var(--border)]">
              {filtradas.map((vistoria) => {
                const config = statusConfig[vistoria.status] || statusConfig.em_andamento
                const title = vistoria.obra?.empresa_cliente?.name || vistoria.obra?.name || `Vistoria ${vistoria.numero}`
                const href = vistoria.status === 'concluida' || vistoria.status === 'assinada'
                  ? `/dashboard/vistorias/${vistoria.id}/relatorio`
                  : `/dashboard/vistorias/${vistoria.id}`

                return (
                  <button
                    key={vistoria.id}
                    onClick={() => router.push(href)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[var(--text-primary)] text-sm">{title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-[var(--text-muted)]">Nº {vistoria.numero}</span>
                        <span className="text-xs text-[var(--text-muted)]">{formatDate(vistoria.data_vistoria)}</span>
                        {vistoria.avaliador?.full_name && (
                          <span className="text-xs text-[var(--text-muted)]">{vistoria.avaliador.full_name}</span>
                        )}
                        {vistoria.indice_conformidade !== null && (
                          <span className="text-xs text-[var(--text-muted)]">{vistoria.indice_conformidade}% {vistoria.classificacao || ''}</span>
                        )}
                        {(vistoria.total_nao_conformes || 0) > 0 && (
                          <span className="text-xs text-amber-400">{vistoria.total_nao_conformes} NCs</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
