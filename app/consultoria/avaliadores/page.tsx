'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, Mail, Phone, Search,
  ShieldCheck, UserCog, Users
} from 'lucide-react'

interface Avaliador {
  id: string
  full_name: string
  email: string
  role: string
  tipo_registro: string | null
  registro_mte: string | null
  crea: string | null
  phone: string | null
  active: boolean
  vistorias?: { id: string; status: string | null }[]
}

const roleLabel: Record<string, string> = {
  gestor: 'Gestor',
  avaliador: 'Avaliador',
  estagiario: 'Estagiario',
  viewer: 'Visualizacao',
}

const roleColor: Record<string, string> = {
  gestor: 'bg-purple-900/40 text-purple-300',
  avaliador: 'bg-blue-900/40 text-blue-300',
  estagiario: 'bg-amber-900/40 text-amber-300',
  viewer: 'bg-slate-700 text-[var(--text-primary)]',
}

export default function ConsultoriaAvaliadoresPage() {
  const router = useRouter()
  const [avaliadores, setAvaliadores] = useState<Avaliador[]>([])
  const [consultoriaName, setConsultoriaName] = useState('')
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

      const { data: current } = await supabase
        .from('avaliadores')
        .select('consultoria_id, role, consultoria:consultorias(name)')
        .eq('id', user.id)
        .single()

      if (!current) {
        router.push('/auth/login')
        return
      }

      if (current.role !== 'gestor') {
        router.push('/dashboard')
        return
      }

      const consultoria = Array.isArray(current.consultoria)
        ? current.consultoria[0]
        : current.consultoria
      setConsultoriaName(consultoria?.name || '')

      const { data } = await supabase
        .from('avaliadores')
        .select('id, full_name, email, role, tipo_registro, registro_mte, crea, phone, active, vistorias(id, status)')
        .eq('consultoria_id', current.consultoria_id)
        .order('full_name')

      setAvaliadores((data || []) as Avaliador[])
    } finally {
      setLoading(false)
    }
  }

  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase()
    if (!termo) return avaliadores
    return avaliadores.filter((avaliador) =>
      avaliador.full_name.toLowerCase().includes(termo) ||
      avaliador.email.toLowerCase().includes(termo) ||
      (avaliador.registro_mte || '').toLowerCase().includes(termo) ||
      (avaliador.crea || '').toLowerCase().includes(termo)
    )
  }, [avaliadores, search])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/consultoria')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Avaliadores</h1>
          <p className="text-xs text-[var(--text-muted)]">{consultoriaName || 'Equipe da consultoria'}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
            <Users size={18} className="text-blue-400" />
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{avaliadores.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Cadastrados</div>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
            <ShieldCheck size={18} className="text-green-400" />
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{avaliadores.filter((a) => a.active).length}</div>
            <div className="text-xs text-[var(--text-muted)]">Ativos</div>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 col-span-2 sm:col-span-1">
            <UserCog size={18} className="text-purple-400" />
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{avaliadores.filter((a) => a.role === 'gestor').length}</div>
            <div className="text-xs text-[var(--text-muted)]">Gestores</div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou registro..."
            className="w-full pl-9 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[var(--brand)]" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
            <Users size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Nenhum avaliador encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtrados.map((avaliador) => {
              const totalVistorias = avaliador.vistorias?.length || 0
              const registro = avaliador.registro_mte ? `MTE ${avaliador.registro_mte}` : avaliador.crea

              return (
                <div key={avaliador.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-[var(--brand)]/20 border border-[var(--brand)]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--brand)]">
                        {avaliador.full_name.split(' ').slice(0, 2).map((name) => name[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{avaliador.full_name}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[avaliador.role] || roleColor.viewer}`}>
                          {roleLabel[avaliador.role] || avaliador.role}
                        </span>
                        {!avaliador.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Inativo</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Mail size={11} /> {avaliador.email}
                        </span>
                        {avaliador.phone && (
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Phone size={11} /> {avaliador.phone}
                          </span>
                        )}
                        {registro && <span className="text-xs text-[var(--text-muted)]">{registro}</span>}
                        <span className="text-xs text-[var(--text-secondary)]">{totalVistorias} vistoria{totalVistorias === 1 ? '' : 's'}</span>
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
