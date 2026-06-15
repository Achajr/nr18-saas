'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ArrowLeft, Building2, FileText, Loader2, MapPin,
  Plus, Search
} from 'lucide-react'

interface Empresa {
  id: string
  name: string
  cnpj: string | null
  cidade: string | null
  uf: string | null
  grau_risco: string | null
  active: boolean
  obras?: { id: string; status: string | null }[]
}

const grauColors: Record<string, string> = {
  '1': 'bg-green-900/40 text-green-400',
  '2': 'bg-blue-900/40 text-blue-400',
  '3': 'bg-amber-900/40 text-amber-400',
  '4': 'bg-red-900/40 text-red-400',
}

export default function DashboardEmpresasPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
        .select('consultoria_id')
        .eq('id', user.id)
        .single()

      if (!av) {
        router.push('/auth/login')
        return
      }

      const { data } = await supabase
        .from('empresas_clientes')
        .select('id, name, cnpj, cidade, uf, grau_risco, active, obras(id, status)')
        .eq('consultoria_id', av.consultoria_id)
        .order('name')

      setEmpresas((data || []) as Empresa[])
    } finally {
      setLoading(false)
    }
  }

  const empresasFiltradas = useMemo(() => {
    const termo = search.trim().toLowerCase()
    if (!termo) return empresas
    return empresas.filter((empresa) =>
      empresa.name.toLowerCase().includes(termo) ||
      (empresa.cnpj || '').toLowerCase().includes(termo) ||
      (empresa.cidade || '').toLowerCase().includes(termo)
    )
  }, [empresas, search])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Empresas</h1>
          <p className="text-xs text-[var(--text-muted)]">Clientes disponíveis para vistoria</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/obras/nova')}
          className="ml-auto flex items-center gap-2 px-3 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold rounded-xl transition"
        >
          <Plus size={15} />
          Vistoria
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por empresa, CNPJ ou cidade..."
            className="w-full pl-9 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[var(--brand)]" />
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
            <Building2 size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {empresasFiltradas.map((empresa) => {
              const obrasAtivas = empresa.obras?.filter((obra) => obra.status !== 'cancelada').length || 0
              return (
                <div key={empresa.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-[var(--brand)]/20 border border-[var(--brand)]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--brand)]">{empresa.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-[var(--text-primary)] text-sm">{empresa.name}</h2>
                        {empresa.grau_risco && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${grauColors[empresa.grau_risco] || 'bg-slate-700 text-[var(--text-primary)]'}`}>
                            Grau {empresa.grau_risco}
                          </span>
                        )}
                        {!empresa.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativa</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {empresa.cnpj && <span className="text-xs text-[var(--text-muted)]">{empresa.cnpj}</span>}
                        {empresa.cidade && (
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin size={11} /> {empresa.cidade}/{empresa.uf}
                          </span>
                        )}
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <FileText size={11} /> {obrasAtivas} obra{obrasAtivas === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
