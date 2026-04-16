import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown, CreditCard, BarChart2, Wallet
} from 'lucide-react'
import Dashboard from './components/dashboard/Dashboard'
import Ingresos from './modules/ingresos/Ingresos'
import Gastos from './modules/gastos/Gastos'
import Creditos from './modules/creditos/Creditos'
import Inversiones from './modules/inversiones/Inversiones'
import Saldos from './modules/saldos/Saldos'
import './styles/globals.css'
import './App.css'

const NAV = [
  { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/ingresos', label: 'Ingresos', Icon: TrendingUp },
  { path: '/gastos', label: 'Gastos', Icon: TrendingDown },
  { path: '/creditos', label: 'Créditos', Icon: CreditCard },
  { path: '/inversiones', label: 'Inversiones', Icon: BarChart2 },
  { path: '/saldos', label: 'Saldos', Icon: Wallet },
]

type Period = 'Hoy' | 'Semana' | 'Mes'

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
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
            <div className="avatar">MB</div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ingresos" element={<Ingresos />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/creditos" element={<Creditos />} />
            <Route path="/inversiones" element={<Inversiones />} />
            <Route path="/saldos" element={<Saldos />} />
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
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
