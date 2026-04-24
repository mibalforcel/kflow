import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown, CreditCard, BarChart2, Wallet, PiggyBank,
} from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProfileProvider, useProfile } from './contexts/ProfileContext'
import ProtectedRoute from './components/ProtectedRoute'
import ProfileModal from './components/ProfileModal'
import Dashboard from './components/dashboard/Dashboard'
import Ingresos from './modules/ingresos/Ingresos'
import Gastos from './modules/gastos/Gastos'
import Creditos from './modules/creditos/Creditos'
import Inversiones from './modules/inversiones/Inversiones'
import Ahorros from './modules/ahorros/Ahorros'
import Saldos from './modules/saldos/Saldos'
import Login from './pages/Login'
import './styles/globals.css'
import './App.css'

const NAV = [
  { path: '/',            label: 'Dashboard',   Icon: LayoutDashboard },
  { path: '/ingresos',    label: 'Ingresos',    Icon: TrendingUp },
  { path: '/gastos',      label: 'Gastos',      Icon: TrendingDown },
  { path: '/creditos',    label: 'Créditos',    Icon: CreditCard },
  { path: '/ahorros',     label: 'Ahorros',     Icon: PiggyBank },
  { path: '/inversiones', label: 'Inversiones', Icon: BarChart2 },
  { path: '/saldos',      label: 'Saldos',      Icon: Wallet },
]

type Period = 'Hoy' | 'Semana' | 'Mes'

function getInitials(name: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(' ').filter(Boolean)
    return parts.slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'KF'
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'KF'
}

function AvatarButton({ onOpen }: { onOpen: () => void }) {
  const { user } = useAuth()
  const { profile } = useProfile()

  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined)
  const displayName = profile?.display_name ?? (user?.user_metadata?.full_name as string | undefined) ?? ''
  const email = user?.email ?? ''

  return (
    <div className="avatar-wrap">
      {displayName && (
        <span className="topbar__username">{displayName.split(' ')[0]}</span>
      )}
      <button
        className="avatar"
        onClick={onOpen}
        title={displayName || email}
        aria-label="Abrir perfil"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />
          : getInitials(displayName, email)
        }
      </button>
    </div>
  )
}

function Layout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()
  const [period, setPeriod]         = useState<Period>('Mes')
  const [profileOpen, setProfileOpen] = useState(false)

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
            {user && <AvatarButton onOpen={() => setProfileOpen(true)} />}
          </div>
        </header>

        {/* CONTENT */}
        <main className="content">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/ingresos"    element={<Ingresos />} />
            <Route path="/gastos"      element={<Gastos period={period} />} />
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

      {/* PROFILE DRAWER */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

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
              <ProfileProvider>
                <Layout />
              </ProfileProvider>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
