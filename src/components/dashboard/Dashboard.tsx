import './Dashboard.css'
import { TrendingUp, TrendingDown, CreditCard, BarChart2, Wallet } from 'lucide-react'

const mockInversiones = [
  { ticker: 'AAPL', name: 'Apple Inc.', variacion: 2.34, valor: '$182.50' },
  { ticker: 'MSFT', name: 'Microsoft', variacion: -0.87, valor: '$415.20' },
  { ticker: 'NVDA', name: 'NVIDIA', variacion: 4.12, valor: '$890.40' },
  { ticker: 'BTC', name: 'Bitcoin', variacion: 1.56, valor: '$67,400' },
]

const mockSaldos = [
  { nombre: 'Santander', tipo: 'Débito', monto: '$12,450.00' },
  { nombre: 'BBVA', tipo: 'Débito', monto: '$8,200.00' },
  { nombre: 'Nu Bank', tipo: 'Ahorro', monto: '$5,890.50' },
  { nombre: 'Efectivo', tipo: 'Cash', monto: '$1,200.00' },
]

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">

        {/* INGRESOS */}
        <div className="card card--ingresos">
          <div className="card__header">
            <div className="card__icon" style={{ background: 'rgba(29, 158, 117, 0.15)' }}>
              <TrendingUp size={18} color="var(--green)" />
            </div>
            <span className="card__label">INGRESOS</span>
          </div>
          <div className="card__main">
            <span className="card__amount">$18,500</span>
            <span className="card__badge card__badge--green">+12.4%</span>
          </div>
          <div className="card__sub">Hoy: <strong>$2,300</strong></div>
          <div className="card__row">
            <span className="card__meta">Acumulado mes</span>
            <span className="card__meta-value" style={{ color: 'var(--green)' }}>$18,500</span>
          </div>
          <div className="card__row">
            <span className="card__meta">Transacciones</span>
            <span className="card__meta-value">14</span>
          </div>
        </div>

        {/* GASTOS */}
        <div className="card card--gastos">
          <div className="card__header">
            <div className="card__icon" style={{ background: 'rgba(226, 75, 74, 0.15)' }}>
              <TrendingDown size={18} color="var(--red)" />
            </div>
            <span className="card__label">GASTOS</span>
          </div>
          <div className="card__main">
            <span className="card__amount">$7,240</span>
            <span className="card__badge card__badge--red">+8.1%</span>
          </div>
          <div className="card__sub">Hoy: <strong>$890</strong></div>
          <div className="card__row">
            <span className="card__meta">Acumulado mes</span>
            <span className="card__meta-value" style={{ color: 'var(--red)' }}>$7,240</span>
          </div>
          <div className="card__row">
            <span className="card__meta">Transacciones</span>
            <span className="card__meta-value">38</span>
          </div>
        </div>

        {/* CRÉDITOS */}
        <div className="card card--creditos">
          <div className="card__header">
            <div className="card__icon" style={{ background: 'rgba(55, 138, 221, 0.15)' }}>
              <CreditCard size={18} color="var(--blue)" />
            </div>
            <span className="card__label">CRÉDITOS</span>
          </div>
          <div className="card__main">
            <span className="card__amount">$24,600</span>
            <span className="card__badge card__badge--blue">49%</span>
          </div>
          <div className="card__sub">Límite: <strong>$50,000</strong></div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: '49%', background: 'var(--blue)' }} />
          </div>
          <div className="card__row" style={{ marginTop: '8px' }}>
            <span className="card__meta">Próximo pago</span>
            <span className="card__meta-value" style={{ color: 'var(--blue)' }}>$4,200 — 28 abr</span>
          </div>
        </div>

        {/* INVERSIONES */}
        <div className="card card--inversiones">
          <div className="card__header">
            <div className="card__icon" style={{ background: 'rgba(83, 74, 183, 0.15)' }}>
              <BarChart2 size={18} color="var(--purple)" />
            </div>
            <span className="card__label">INVERSIONES</span>
          </div>
          <div className="card__main">
            <span className="card__amount">$92,340</span>
            <span className="card__badge card__badge--purple">+3.2%</span>
          </div>
          <div className="inv-list">
            {mockInversiones.map((inv) => (
              <div key={inv.ticker} className="inv-row">
                <span className="inv-ticker">{inv.ticker}</span>
                <span className="inv-valor">{inv.valor}</span>
                <span className={`inv-variacion ${inv.variacion >= 0 ? 'pos' : 'neg'}`}>
                  {inv.variacion >= 0 ? '+' : ''}{inv.variacion}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SALDOS */}
        <div className="card card--saldos">
          <div className="card__header">
            <div className="card__icon" style={{ background: 'rgba(212, 160, 23, 0.15)' }}>
              <Wallet size={18} color="var(--gold)" />
            </div>
            <span className="card__label">SALDOS</span>
          </div>
          <div className="card__main">
            <span className="card__amount">$27,740</span>
            <span className="card__badge card__badge--gold">Total</span>
          </div>
          <div className="saldos-grid">
            {mockSaldos.map((s) => (
              <div key={s.nombre} className="saldo-item">
                <div className="saldo-nombre">{s.nombre}</div>
                <div className="saldo-tipo">{s.tipo}</div>
                <div className="saldo-monto">{s.monto}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
