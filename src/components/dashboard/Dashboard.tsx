import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, CreditCard, BarChart2, Wallet, PiggyBank, Loader2 } from 'lucide-react'
import { fetchIngresos, fetchGastos, fetchCreditos, fetchInversiones, fetchSaldos, fetchAhorros, fetchPlaidConnection } from '../../lib/db'
import { useAuth } from '../../contexts/AuthContext'
import type { IngresoRow, GastoRow, CreditoRow, InversionRow, SaldoRow, AhorroRow } from '../../lib/types'
import './Dashboard.css'

const PLAID_GET_ACCOUNTS = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-get-accounts'

const MES = new Date().toISOString().slice(0, 7)
const HOY = new Date().toISOString().slice(0, 10)

function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}

export default function Dashboard() {
  const { user } = useAuth()

  const [ingresos,    setIngresos]    = useState<IngresoRow[]>([])
  const [gastos,      setGastos]      = useState<GastoRow[]>([])
  const [creditos,    setCreditos]    = useState<CreditoRow[]>([])
  const [inversiones, setInversiones] = useState<InversionRow[]>([])
  const [saldos,      setSaldos]      = useState<SaldoRow[]>([])
  const [ahorros,     setAhorros]     = useState<AhorroRow[]>([])
  const [plaidTotal,  setPlaidTotal]  = useState(0)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      fetchIngresos(),
      fetchGastos(),
      fetchCreditos(),
      fetchInversiones(),
      fetchSaldos(),
      fetchAhorros(),
      fetchPlaidConnection(),
    ]).then(([ing, gas, cre, inv, sal, aho, conn]) => {
      setIngresos(ing); setGastos(gas); setCreditos(cre)
      setInversiones(inv); setSaldos(sal); setAhorros(aho)
      if (conn && user) {
        fetch(PLAID_GET_ACCOUNTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d?.accounts) return
            const total = (d.accounts as { balances: { current: number | null } }[])
              .reduce((s, a) => s + (a.balances.current ?? 0), 0)
            setPlaidTotal(total)
          })
          .catch(() => {})
      }
    }).finally(() => setLoading(false))
  }, [user])

  // Ingresos
  const totalIngresosMes = useMemo(() => ingresos.filter(i => i.fecha.startsWith(MES)).reduce((s, i) => s + i.monto, 0), [ingresos])
  const totalIngresosHoy = useMemo(() => ingresos.filter(i => i.fecha === HOY).reduce((s, i) => s + i.monto, 0), [ingresos])
  const txIngresosMes    = useMemo(() => ingresos.filter(i => i.fecha.startsWith(MES)).length, [ingresos])

  // Gastos
  const totalGastosMes = useMemo(() => gastos.filter(g => g.fecha.startsWith(MES)).reduce((s, g) => s + g.monto, 0), [gastos])
  const totalGastosHoy = useMemo(() => gastos.filter(g => g.fecha === HOY).reduce((s, g) => s + g.monto, 0), [gastos])
  const txGastosMes    = useMemo(() => gastos.filter(g => g.fecha.startsWith(MES)).length, [gastos])

  // Créditos
  const totalAdeudado  = useMemo(() => creditos.reduce((s, c) => s + (c.monto_total - c.monto_pagado), 0), [creditos])
  const totalCredito   = useMemo(() => creditos.reduce((s, c) => s + c.monto_total, 0), [creditos])
  const pctCredito     = totalCredito > 0 ? Math.round((totalAdeudado / totalCredito) * 100) : 0
  const proximoPago    = useMemo(() => {
    const sorted = [...creditos].filter(c => c.proximo_pago).sort((a, b) => a.proximo_pago!.localeCompare(b.proximo_pago!))
    return sorted[0] ?? null
  }, [creditos])

  // Inversiones
  const totalInv = useMemo(() => inversiones.reduce((s, i) => s + i.precio_actual * i.cantidad, 0), [inversiones])

  // Saldos (manual + Plaid)
  const totalSaldosManual = useMemo(() => saldos.reduce((s, c) => s + c.saldo, 0), [saldos])
  const totalSaldos = totalSaldosManual + plaidTotal

  // Ahorros
  const totalAhorrado  = useMemo(() => ahorros.reduce((s, m) => s + m.monto_actual, 0), [ahorros])
  const metasActivas   = useMemo(() => ahorros.filter(m => m.monto_actual < m.monto_objetivo).length, [ahorros])
  const metasCumplidas = useMemo(() => ahorros.filter(m => m.monto_actual >= m.monto_objetivo && m.monto_objetivo > 0).length, [ahorros])

  if (loading) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 10, color: 'var(--text-muted)' }}>
        <Loader2 size={22} className="spin" /> Cargando...
      </div>
    )
  }

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
            <span className="card__amount">{fmt(totalIngresosMes)}</span>
          </div>
          <div className="card__sub">Hoy: <strong>{fmt(totalIngresosHoy)}</strong></div>
          <div className="card__row">
            <span className="card__meta">Acumulado mes</span>
            <span className="card__meta-value" style={{ color: 'var(--green)' }}>{fmt(totalIngresosMes)}</span>
          </div>
          <div className="card__row">
            <span className="card__meta">Transacciones</span>
            <span className="card__meta-value">{txIngresosMes}</span>
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
            <span className="card__amount">{fmt(totalGastosMes)}</span>
          </div>
          <div className="card__sub">Hoy: <strong>{fmt(totalGastosHoy)}</strong></div>
          <div className="card__row">
            <span className="card__meta">Acumulado mes</span>
            <span className="card__meta-value" style={{ color: 'var(--red)' }}>{fmt(totalGastosMes)}</span>
          </div>
          <div className="card__row">
            <span className="card__meta">Transacciones</span>
            <span className="card__meta-value">{txGastosMes}</span>
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
            <span className="card__amount">{fmt(totalAdeudado)}</span>
            {totalCredito > 0 && <span className="card__badge card__badge--blue">{pctCredito}%</span>}
          </div>
          <div className="card__sub">Total créditos: <strong>{fmt(totalCredito)}</strong></div>
          {totalCredito > 0 && (
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${pctCredito}%`, background: 'var(--blue)' }} />
            </div>
          )}
          <div className="card__row" style={{ marginTop: '8px' }}>
            <span className="card__meta">Próximo pago</span>
            <span className="card__meta-value" style={{ color: 'var(--blue)' }}>
              {proximoPago ? `${fmt(proximoPago.monto_total - proximoPago.monto_pagado)} — ${fmtFecha(proximoPago.proximo_pago!)}` : '—'}
            </span>
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
            <span className="card__amount">{fmt(totalInv)}</span>
          </div>
          <div className="inv-list">
            {inversiones.slice(0, 4).map(inv => (
              <div key={inv.id} className="inv-row">
                <span className="inv-ticker">{inv.ticker}</span>
                <span className="inv-valor">${inv.precio_actual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`inv-variacion ${inv.variacion_dia >= 0 ? 'pos' : 'neg'}`}>
                  {inv.variacion_dia >= 0 ? '+' : ''}{inv.variacion_dia.toFixed(2)}%
                </span>
              </div>
            ))}
            {inversiones.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '8px 0' }}>Sin posiciones</div>}
          </div>
        </div>

        {/* AHORROS */}
        <div className="card card--ahorros">
          <div className="card__header">
            <div className="card__icon" style={{ background: 'rgba(29, 158, 117, 0.15)' }}>
              <PiggyBank size={18} color="var(--green)" />
            </div>
            <span className="card__label">AHORROS</span>
          </div>
          <div className="card__main">
            <span className="card__amount" style={{ color: 'var(--green)' }}>{fmt(totalAhorrado)}</span>
          </div>
          <div className="card__sub">Metas activas: <strong>{metasActivas}</strong></div>
          <div className="card__row">
            <span className="card__meta">Total ahorrado</span>
            <span className="card__meta-value" style={{ color: 'var(--green)' }}>{fmt(totalAhorrado)}</span>
          </div>
          <div className="card__row">
            <span className="card__meta">Metas cumplidas</span>
            <span className="card__meta-value" style={{ color: 'var(--green)' }}>{metasCumplidas}</span>
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
            <span className="card__amount" style={{ color: totalSaldos >= 0 ? undefined : 'var(--red)' }}>{fmt(totalSaldos)}</span>
            <span className="card__badge card__badge--gold">Total</span>
          </div>
          <div className="saldos-grid">
            {saldos.slice(0, 4).map(s => (
              <div key={s.id} className="saldo-item">
                <div className="saldo-nombre">{s.nombre}</div>
                <div className="saldo-tipo">{s.tipo}</div>
                <div className="saldo-monto" style={{ color: s.saldo < 0 ? 'var(--red)' : undefined }}>
                  ${Math.abs(s.saldo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
            {saldos.length === 0 && plaidTotal === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', gridColumn: '1/-1' }}>Sin cuentas</div>}
            {plaidTotal > 0 && (
              <div className="saldo-item">
                <div className="saldo-nombre">Banco (Plaid)</div>
                <div className="saldo-tipo">Conectado</div>
                <div className="saldo-monto">${plaidTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
