'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, Users, FileText, ClipboardList,
  Plus, LogOut, ChevronLeft, ChevronRight, BarChart3, Palette,
  type LucideIcon
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

type Perfil = 'master' | 'gestor' | 'avaliador' | null

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  badge?: number
}

const THEMES = [
  { id: 'light',  label: 'Claro Pro', color: '#f6f8fc' },
  { id: 'dark',   label: 'Grafite',   color: '#0b1020' },
  { id: 'navy',   label: 'Cobalto',   color: '#081225' },
  { id: 'forest', label: 'Emerald',   color: '#f5faf7' },
  { id: 'sunset', label: 'Copper',    color: '#faf8f5' },
]

export default function AppNav({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [perfil, setPerfil] = useState<Perfil>(null)
  const [user, setUser] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState('light')
  const [showThemes, setShowThemes] = useState(false)
  const [pendentes, setPendentes] = useState(0)
  const [loading, setLoading] = useState(true)

  // Rotas publicas — sem nav
  const publicRoutes = ['/auth/login', '/auth/register', '/']
  const isPublic = publicRoutes.includes(pathname) || pathname.startsWith('/auth')

  useEffect(() => {
    if (isPublic) {
      setLoading(false)
      return
    }

    // Carrega tema salvo
    const savedTheme = localStorage.getItem('nr18-theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)

    const savedCollapsed = localStorage.getItem('nr18-sidebar-collapsed') === 'true'
    setCollapsed(savedCollapsed)

    loadUser()
  }, [isPublic])

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Verifica master
      const { data: master } = await supabase.from('master_admins').select('id, full_name').eq('id', user.id).single()
      if (master) { setUser({ ...master, email: user.email }); setPerfil('master'); setLoading(false); return }

      // Verifica avaliador/gestor
      const { data: av } = await supabase.from('avaliadores').select('*, consultoria:consultorias(name)').eq('id', user.id).single()
      if (av) {
        setUser({ ...av, email: user.email })
        setPerfil(av.role === 'gestor' ? 'gestor' : 'avaliador')

        // Conta vistorias pendentes
        if (av.role !== 'gestor') {
          const { count } = await supabase.from('vistorias').select('*', { count: 'exact', head: true })
            .eq('avaliador_id', user.id).in('status', ['incompleta', 'em_andamento'])
          setPendentes(count || 0)
        } else {
          const { count } = await supabase.from('vistorias').select('*', { count: 'exact', head: true })
            .eq('consultoria_id', av.consultoria_id).in('status', ['incompleta', 'em_andamento'])
          setPendentes(count || 0)
        }
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function changeTheme(t: string) {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('nr18-theme', t)
    setShowThemes(false)
  }

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('nr18-sidebar-collapsed', String(next))
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  function navigate(href: string) { router.push(href) }

  // Define itens de navegação por perfil
  const navItems: NavItem[] = perfil === 'master' ? [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/master' },
    { label: 'Consultorias', icon: Building2, href: '/master/consultorias' },
    { label: 'Avaliadores', icon: Users, href: '/master/avaliadores' },
  ] : perfil === 'gestor' ? [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/consultoria' },
    { label: 'Empresas', icon: Building2, href: '/consultoria/empresas' },
    { label: 'Avaliadores', icon: Users, href: '/consultoria/avaliadores' },
    { label: 'Checklists', icon: ClipboardList, href: '/consultoria/checklists' },
    { label: 'Relatórios', icon: BarChart3, href: '/consultoria/relatorios', badge: pendentes || undefined },
  ] : [
    { label: 'Início', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Nova vistoria', icon: Plus, href: '/dashboard/obras/nova' },
    { label: 'Relatórios', icon: FileText, href: '/dashboard/relatorios', badge: pendentes || undefined },
  ]

  // Bottom nav items (mobile) — max 5
  const bottomItems: NavItem[] = perfil === 'master' ? [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/master' },
    { label: 'Consultorias', icon: Building2, href: '/master/consultorias' },
    { label: 'Avaliadores', icon: Users, href: '/master/avaliadores' },
  ] : perfil === 'gestor' ? [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/consultoria' },
    { label: 'Empresas', icon: Building2, href: '/consultoria/empresas' },
    { label: 'Checklists', icon: ClipboardList, href: '/consultoria/checklists' },
    { label: 'Relatórios', icon: BarChart3, href: '/consultoria/relatorios', badge: pendentes || undefined },
  ] : [
    { label: 'Início', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Nova', icon: Plus, href: '/dashboard/obras/nova' },
    { label: 'Relatórios', icon: FileText, href: '/dashboard/relatorios', badge: pendentes || undefined },
  ]

  const initials = user?.full_name?.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase() || '??'
  const consultoriaName = user?.consultoria?.name || (perfil === 'master' ? 'Master Admin' : '')

  if (isPublic) return <>{children}</>

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="app-shell">

      {/* ── SIDEBAR (desktop) ── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

        {/* Toggle */}
        <button className="sidebar-toggle" onClick={toggleCollapsed}>
          {collapsed
            ? <ChevronRight size={12} />
            : <ChevronLeft size={12} />
          }
        </button>

        {/* Logo */}
        <div className="sidebar-logo">
          <BrandLogo
            size="sm"
            markOnly={collapsed}
            subtitle={consultoriaName || 'Vistorias e conformidade'}
          />
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {!collapsed && <div className="sidebar-section-label">Menu</div>}
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <a key={item.href} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.href)} style={{ cursor: 'pointer' }}>
                <span className="nav-item-icon"><item.icon size={18} /></span>
                {!collapsed && <span className="nav-item-label">{item.label}</span>}
                {!collapsed && item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </a>
            )
          })}

          {!collapsed && <div className="sidebar-section-label" style={{ marginTop: 12 }}>Sistema</div>}

          {/* Temas */}
          <a className="nav-item" onClick={() => setShowThemes(!showThemes)} style={{ cursor: 'pointer' }}>
            <span className="nav-item-icon"><Palette size={18} /></span>
            {!collapsed && <span className="nav-item-label">Tema</span>}
          </a>

          {showThemes && !collapsed && (
            <div style={{ padding: '8px 10px' }}>
              <div className="theme-switcher">
                {THEMES.map(t => (
                  <div key={t.id} className={`theme-dot ${theme === t.id ? 'active' : ''}`}
                    style={{ background: t.color, border: '1.5px solid var(--border)' }}
                    onClick={() => changeTheme(t.id)}
                    title={t.label}
                  />
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                {THEMES.find(t => t.id === theme)?.label}
              </div>
            </div>
          )}

          {showThemes && collapsed && (
            <div style={{ padding: '4px' }}>
              {THEMES.map(t => (
                <div key={t.id} className={`theme-dot ${theme === t.id ? 'active' : ''}`}
                  style={{ background: t.color, border: '1.5px solid var(--border)', margin: '4px auto' }}
                  onClick={() => changeTheme(t.id)}
                  title={t.label}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            {!collapsed && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
            )}
          </div>
          <a className="nav-item" onClick={logout} style={{ cursor: 'pointer', color: 'var(--danger)' }}>
            <span className="nav-item-icon"><LogOut size={16} /></span>
            {!collapsed && <span className="nav-item-label">Sair</span>}
          </a>
        </div>
      </aside>

      {/* ── CONTEÚDO ── */}
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {bottomItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const isNew = item.label === 'Nova' || item.label === 'Nova vistoria'
            if (isNew) {
              return (
                <div key={item.href} className="bottom-nav-item" onClick={() => navigate(item.href)}>
                  <div className="fab"><item.icon size={22} color="white" /></div>
                  <span className="bottom-nav-item-label" style={{ color: 'var(--brand)', fontWeight: 700 }}>{item.label}</span>
                </div>
              )
            }
            return (
              <div key={item.href} className={`bottom-nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.href)}>
                <div className="bottom-nav-item-icon">
                  <item.icon size={20} />
                  {item.badge ? <span className="bottom-nav-badge">{item.badge}</span> : null}
                </div>
                <span className="bottom-nav-item-label">{item.label}</span>
              </div>
            )
          })}

          {/* Tema no mobile */}
          <div className="bottom-nav-item" onClick={() => {
            const idx = THEMES.findIndex(t => t.id === theme)
            const next = THEMES[(idx + 1) % THEMES.length]
            changeTheme(next.id)
          }}>
            <div className="bottom-nav-item-icon">
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: THEMES.find(t=>t.id===theme)?.color, border: '2px solid var(--brand)' }} />
            </div>
            <span className="bottom-nav-item-label">Tema</span>
          </div>
        </div>
      </nav>

    </div>
  )
}
