import { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown, CreditCard, BarChart2, Wallet, PiggyBank, LogOut
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './components/dashboard/Dashboard'
import Ingresos from './modules/ingresos/Ingresos'
import Gastos from './modules/gastos/Gastos'
import Creditos from './modules/creditos/Creditos'
import Inversiones from './modules/inversiones/Inversiones'
import Ahorros from './modules/ahorros/Ahorros'
import Saldos from './modules/saldos/Saldos'
import Login from './pages/Login'
import { signOut } from './lib/auth'
import './styles/globals.css'
import './App.css'

const NAV = [
  { path: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
  { path: '/ingresos',   label: 'Ingresos',   Icon: TrendingUp },
  { path: '/gastos',     label: 'Gastos',     Icon: TrendingDown },
  { path: '/creditos',   label: 'Créditos',   Icon: CreditCard },
  { path: '/ahorros',    label: 'Ahorros',    Icon: PiggyBank },
  { path: '/inversiones',label: 'Inversiones',Icon: BarChart2 },
  { path: '/saldos',     label: 'Saldos',     Icon: Wallet },
]

type Period = 'Hoy' | 'Semana' | 'Mes'

function getInitials(user: User): string {
  if (user.user_metadata?.full_name) {
    return (user.user_metadata.full_name as string)
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
  }
  if (user.email) return user.email.slice(0, 2).toUpperCase()
  return 'KF'
}

function AvatarMenu({ user }: { user: User }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ''

  return (
    <div className="avatar-wrap" ref={ref}>
      <div className="avatar" onClick={() => setOpen(v => !v)} title={displayName}>
        {getInitials(user)}
      </div>
      {open && (
        <div className="avatar-menu">
          <div className="avatar-menu__info">
            {user.user_metadata?.full_name && (
              <span className="avatar-menu__name">{user.user_metadata.full_name as string}</span>
            )}
            <span className="avatar-menu__email">{user.email}</span>
          </div>
          <div className="avatar-menu__divider" />
          <button className="avatar-menu__logout" onClick={handleLogout}>
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

function Layout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()
  const [period, setPeriod] = useState<Period>('Mes')

  const active = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <div className="app-shell">

      {/* SIDEBAR — desktop */}
      <aside className="sidebar">
        <div className="sidebar__logo">
          <span className="logo-mark">K</span>
        </div>
        <nav className="sidebar__nav">
          {NAV.map(({ path, label, Icon }) => (
            <button
              key={path}
              className={`sidebar__item ${active(path) ? 'sidebar__item--active' : ''}`}
              onClick={() => navigate(path)}
              title={label}
            >
              <Icon size={20} />
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <div className="main-wrapper">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar__left">
            <span className="topbar__logo">K'Flow</span>
            <span className="topbar__separator" />
            <span className="topbar__section">
              {NAV.find(n => active(n.path))?.label ?? 'Dashboard'}
            </span>
          </div>
          <div className="topbar__tabs">
            {(['Hoy', 'Semana', 'Mes'] as Period[]).map((p) => (
              <button
                key={p}
                className={`topbar__tab ${period === p ? 'topbar__tab--active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="topbar__right">
            {user && <AvatarMenu user={user} />}
          </div>
        </header>

        {/* CONTENT */}
        <main className="content">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/ingresos"    element={<Ingresos />} />
            <Route path="/gastos"      element={<Gastos />} />
            <Route path="/creditos"    element={<Creditos />} />
            <Route path="/ahorros"     element={<Ahorros />} />
            <Route path="/inversiones" element={<Inversiones />} />
            <Route path="/saldos"      element={<Saldos />} />
          </Routes>
        </main>

        {/* BOTTOM NAV — mobile */}
        <nav className="bottom-nav">
          {NAV.map(({ path, label, Icon }) => (
            <button
              key={path}
              className={`bottom-nav__item ${active(path) ? 'bottom-nav__item--active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
