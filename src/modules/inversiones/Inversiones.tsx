import { useState, useMemo } from 'react'
import { Plus, BarChart2, TrendingUp, TrendingDown, Layers, X } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine
} from 'recharts'
import './Inversiones.css'

interface PuntoHistorial {
  t: number
  v: number
}

interface Inversion {
  id: string
  ticker: string
  nombre: string
  precioActual: number
  precioCompra: number
  cantidad: number
  variacionDia: number // porcentaje
  historial: PuntoHistorial[]
}

/* Genera historial de sparkline sintético */
function genHistorial(base: number, tendencia: number): PuntoHistorial[] {
  const puntos: PuntoHistorial[] = []
  let v = base * (1 - Math.abs(tendencia / 100) * 3)
  for (let i = 0; i < 20; i++) {
    v += (Math.random() - 0.46 + tendencia / 200) * base * 0.015
    puntos.push({ t: i, v: +v.toFixed(2) })
  }
  puntos.push({ t: 20, v: base })
  return puntos
}

const MOCK: Inversion[] = [
  {
    id: '1', ticker: 'AAPL', nombre: 'Apple Inc.',
    precioActual: 182.50, precioCompra: 155.00, cantidad: 10,
    variacionDia: 2.34,
    historial: genHistorial(182.5, 2.34),
  },
  {
    id: '2', ticker: 'MSFT', nombre: 'Microsoft Corp.',
    precioActual: 415.20, precioCompra: 380.00, cantidad: 5,
    variacionDia: -0.87,
    historial: genHistorial(415.2, -0.87),
  },
  {
    id: '3', ticker: 'NVDA', nombre: 'NVIDIA Corp.',
    precioActual: 890.40, precioCompra: 620.00, cantidad: 3,
    variacionDia: 4.12,
    historial: genHistorial(890.4, 4.12),
  },
  {
    id: '4', ticker: 'BTC', nombre: 'Bitcoin',
    precioActual: 67400.00, precioCompra: 58000.00, cantidad: 0.25,
    variacionDia: 1.56,
    historial: genHistorial(67400, 1.56),
  },
]

function fmt(n: number) {
  if (n >= 1000) return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '$' + n.toFixed(2)
}
function fmtPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

function valorTotal(inv: Inversion) { return inv.precioActual * inv.cantidad }
function ganancia(inv: Inversion)   { return (inv.precioActual - inv.precioCompra) * inv.cantidad }

/* Tooltip mínimo para el sparkline */
function SparkTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 7px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
      {fmt(payload[0].value)}
    </div>
  )
}

export default function Inversiones() {
  const [inversiones, setInversiones] = useState<Inversion[]>(MOCK)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({
    ticker: '', nombre: '', precioActual: '', precioCompra: '', cantidad: '', variacionDia: '0'
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const totalValor = useMemo(() => inversiones.reduce((s, i) => s + valorTotal(i), 0), [inversiones])
  const totalGanLoss = useMemo(() => inversiones.reduce((s, i) => {
    const prev = i.precioActual / (1 + i.variacionDia / 100) * i.cantidad
    return s + (valorTotal(i) - prev)
  }, 0), [inversiones])
  const numPosiciones = inversiones.length

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.ticker.trim()) e.ticker = 'Requerido'
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.precioActual || Number(form.precioActual) <= 0) e.precioActual = 'Precio inválido'
    if (!form.precioCompra || Number(form.precioCompra) <= 0) e.precioCompra = 'Precio inválido'
    if (!form.cantidad || Number(form.cantidad) <= 0) e.cantidad = 'Cantidad inválida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const precioActual = Number(form.precioActual)
    const variacion    = Number(form.variacionDia) || 0
    const nueva: Inversion = {
      id: Date.now().toString(),
      ticker: form.ticker.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      precioActual,
      precioCompra: Number(form.precioCompra),
      cantidad: Number(form.cantidad),
      variacionDia: variacion,
      historial: genHistorial(precioActual, variacion),
    }
    setInversiones(prev => [...prev, nueva])
    setForm({ ticker: '', nombre: '', precioActual: '', precioCompra: '', cantidad: '', variacionDia: '0' })
    setErrors({})
    setShowForm(false)
  }

  return (
    <div className="inv-page">

      <div className="inv-header">
        <div>
          <h1 className="inv-title">Inversiones</h1>
          <p className="inv-subtitle">Portafolio actual</p>
        </div>
        <button className="inv-btn inv-btn--accent" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} /> Agregar Posición
        </button>
      </div>

      {/* RESUMEN */}
      <div className="inv-summary">
        <div className="inv-stat">
          <div className="inv-stat__icon" style={{ background: 'rgba(83,74,183,0.12)' }}>
            <BarChart2 size={16} color="var(--purple)" />
          </div>
          <div>
            <div className="inv-stat__label">Valor total</div>
            <div className="inv-stat__value" style={{ color: 'var(--purple)' }}>{fmt(totalValor)}</div>
          </div>
        </div>
        <div className="inv-stat">
          <div className="inv-stat__icon" style={{ background: totalGanLoss >= 0 ? 'rgba(29,158,117,0.12)' : 'rgba(226,75,74,0.12)' }}>
            {totalGanLoss >= 0
              ? <TrendingUp size={16} color="var(--green)" />
              : <TrendingDown size={16} color="var(--red)" />}
          </div>
          <div>
            <div className="inv-stat__label">Gan./Pérd. del día</div>
            <div className="inv-stat__value" style={{ color: totalGanLoss >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {totalGanLoss >= 0 ? '+' : ''}{fmt(totalGanLoss)}
            </div>
          </div>
        </div>
        <div className="inv-stat">
          <div className="inv-stat__icon" style={{ background: 'rgba(83,74,183,0.12)' }}>
            <Layers size={16} color="var(--purple)" />
          </div>
          <div>
            <div className="inv-stat__label">Posiciones</div>
            <div className="inv-stat__value" style={{ color: 'var(--purple)' }}>{numPosiciones}</div>
          </div>
        </div>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div className="inv-form-wrap">
          <div className="inv-form-header">
            <span>Nueva posición</span>
            <button className="inv-close" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form className="inv-form" onSubmit={handleSubmit} noValidate>
            <div className="inv-form__row">
              <div className="inv-field">
                <label className="inv-label">Ticker</label>
                <input
                  type="text" maxLength={10}
                  className={`inv-input ${errors.ticker ? 'inv-input--error' : ''}`}
                  placeholder="Ej. AAPL"
                  value={form.ticker}
                  onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))}
                />
                {errors.ticker && <span className="inv-error">{errors.ticker}</span>}
              </div>
              <div className="inv-field">
                <label className="inv-label">Nombre</label>
                <input
                  type="text"
                  className={`inv-input ${errors.nombre ? 'inv-input--error' : ''}`}
                  placeholder="Ej. Apple Inc."
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
                {errors.nombre && <span className="inv-error">{errors.nombre}</span>}
              </div>
            </div>
            <div className="inv-form__row">
              <div className="inv-field">
                <label className="inv-label">Precio actual ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  className={`inv-input ${errors.precioActual ? 'inv-input--error' : ''}`}
                  placeholder="0.00"
                  value={form.precioActual}
                  onChange={e => setForm(f => ({ ...f, precioActual: e.target.value }))}
                />
                {errors.precioActual && <span className="inv-error">{errors.precioActual}</span>}
              </div>
              <div className="inv-field">
                <label className="inv-label">Precio compra ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  className={`inv-input ${errors.precioCompra ? 'inv-input--error' : ''}`}
                  placeholder="0.00"
                  value={form.precioCompra}
                  onChange={e => setForm(f => ({ ...f, precioCompra: e.target.value }))}
                />
                {errors.precioCompra && <span className="inv-error">{errors.precioCompra}</span>}
              </div>
            </div>
            <div className="inv-form__row">
              <div className="inv-field">
                <label className="inv-label">Cantidad</label>
                <input
                  type="number" min="0" step="any"
                  className={`inv-input ${errors.cantidad ? 'inv-input--error' : ''}`}
                  placeholder="0"
                  value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                />
                {errors.cantidad && <span className="inv-error">{errors.cantidad}</span>}
              </div>
              <div className="inv-field">
                <label className="inv-label">Variación día (%)</label>
                <input
                  type="number" step="0.01"
                  className="inv-input"
                  placeholder="0.00"
                  value={form.variacionDia}
                  onChange={e => setForm(f => ({ ...f, variacionDia: e.target.value }))}
                />
              </div>
            </div>
            <div className="inv-form__actions">
              <button type="button" className="inv-btn inv-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="inv-btn inv-btn--accent"><Plus size={14} /> Agregar</button>
            </div>
          </form>
        </div>
      )}

      {/* CARDS DE INVERSIONES */}
      <div className="inv-list">
        {inversiones.map(inv => {
          const val   = valorTotal(inv)
          const gan   = ganancia(inv)
          const ganPct = ((inv.precioActual - inv.precioCompra) / inv.precioCompra) * 100
          const sube  = inv.variacionDia >= 0
          const lineColor = sube ? 'var(--green)' : 'var(--red)'

          return (
            <div key={inv.id} className="inv-card">
              {/* TOP ROW */}
              <div className="inv-card__top">
                <div className="inv-card__left">
                  <div className="inv-card__ticker-wrap">
                    <span className="inv-card__ticker">{inv.ticker}</span>
                  </div>
                  <div>
                    <div className="inv-card__nombre">{inv.nombre}</div>
                    <div className="inv-card__meta">
                      {inv.cantidad} {inv.ticker.length <= 4 ? 'acciones' : 'unidades'} · compra {fmt(inv.precioCompra)}
                    </div>
                  </div>
                </div>
                <div className="inv-card__right">
                  <div className="inv-card__precio">{fmt(inv.precioActual)}</div>
                  <div className={`inv-card__variacion ${sube ? 'inv-card__variacion--pos' : 'inv-card__variacion--neg'}`}>
                    {sube ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {fmtPct(inv.variacionDia)}
                  </div>
                </div>
              </div>

              {/* SPARKLINE */}
              <div className="inv-card__spark">
                <ResponsiveContainer width="100%" height={52}>
                  <LineChart data={inv.historial} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
                    <ReferenceLine y={inv.historial[0].v} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <Tooltip content={<SparkTooltip />} />
                    <Line
                      type="monotone" dataKey="v"
                      stroke={lineColor} strokeWidth={1.5}
                      dot={false} activeDot={{ r: 3, fill: lineColor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* BOTTOM ROW */}
              <div className="inv-card__bottom">
                <div className="inv-card__monto-item">
                  <span className="inv-card__monto-label">Valor posición</span>
                  <span className="inv-card__monto-val" style={{ color: 'var(--purple)' }}>{fmt(val)}</span>
                </div>
                <div className="inv-card__monto-item inv-card__monto-item--center">
                  <span className="inv-card__monto-label">Gan./Pérd. total</span>
                  <span className="inv-card__monto-val" style={{ color: gan >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {gan >= 0 ? '+' : ''}{fmt(gan)}
                  </span>
                </div>
                <div className="inv-card__monto-item inv-card__monto-item--right">
                  <span className="inv-card__monto-label">Rentabilidad</span>
                  <span className="inv-card__monto-val" style={{ color: ganPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPct(ganPct)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
