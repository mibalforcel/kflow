import { useState, useEffect, useMemo } from 'react'
import { Plus, BarChart2, TrendingUp, TrendingDown, Layers, X, Loader2 } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine } from 'recharts'
import { fetchInversiones, insertInversion } from '../../lib/db'
import type { InversionRow } from '../../lib/types'
import './Inversiones.css'

interface PuntoHistorial { t: number; v: number }

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

function fmt(n: number) {
  if (n >= 1000) return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '$' + n.toFixed(2)
}
function fmtPct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%' }

function SparkTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 7px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
      {fmt(payload[0].value)}
    </div>
  )
}

export default function Inversiones({ period: _period = 'Mes' }: { period?: 'Hoy' | 'Semana' | 'Mes' | 'Año' }) {
  const [inversiones, setInversiones] = useState<InversionRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ticker: '', nombre: '', precioActual: '', precioCompra: '', cantidad: '', variacionDia: '0' })
  const [errors, setErrors]     = useState<Partial<typeof form>>({})

  // historial sintético generado desde precio_actual y variacion_dia
  const [historiales, setHistoriales] = useState<Record<string, PuntoHistorial[]>>({})

  async function cargar() {
    try {
      setLoading(true); setError(null)
      const data = await fetchInversiones()
      setInversiones(data)
      const h: Record<string, PuntoHistorial[]> = {}
      data.forEach(i => { h[i.id] = genHistorial(i.precio_actual, i.variacion_dia) })
      setHistoriales(h)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const totalValor = useMemo(() => inversiones.reduce((s, i) => s + i.precio_actual * i.cantidad, 0), [inversiones])
  const totalGanLoss = useMemo(() => inversiones.reduce((s, i) => {
    const prev = i.precio_actual / (1 + i.variacion_dia / 100) * i.cantidad
    return s + (i.precio_actual * i.cantidad - prev)
  }, 0), [inversiones])

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.ticker.trim()) e.ticker = 'Requerido'
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.precioActual || Number(form.precioActual) <= 0) e.precioActual = 'Precio inválido'
    if (!form.precioCompra || Number(form.precioCompra) <= 0) e.precioCompra = 'Precio inválido'
    if (!form.cantidad || Number(form.cantidad) <= 0) e.cantidad = 'Cantidad inválida'
    setErrors(e); return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      setSaving(true)
      await insertInversion({
        ticker: form.ticker.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        precio_actual: Number(form.precioActual),
        precio_compra: Number(form.precioCompra),
        cantidad: Number(form.cantidad),
        variacion_dia: Number(form.variacionDia) || 0,
      })
      await cargar()
      setForm({ ticker: '', nombre: '', precioActual: '', precioCompra: '', cantidad: '', variacionDia: '0' })
      setErrors({}); setShowForm(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
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

      <div className="inv-summary">
        <div className="inv-stat">
          <div className="inv-stat__icon" style={{ background: 'rgba(83,74,183,0.12)' }}><BarChart2 size={16} color="var(--purple)" /></div>
          <div><div className="inv-stat__label">Valor total</div><div className="inv-stat__value" style={{ color: 'var(--purple)' }}>{loading ? '—' : fmt(totalValor)}</div></div>
        </div>
        <div className="inv-stat">
          <div className="inv-stat__icon" style={{ background: totalGanLoss >= 0 ? 'rgba(29,158,117,0.12)' : 'rgba(226,75,74,0.12)' }}>
            {totalGanLoss >= 0 ? <TrendingUp size={16} color="var(--green)" /> : <TrendingDown size={16} color="var(--red)" />}
          </div>
          <div><div className="inv-stat__label">Gan./Pérd. del día</div><div className="inv-stat__value" style={{ color: totalGanLoss >= 0 ? 'var(--green)' : 'var(--red)' }}>{loading ? '—' : (totalGanLoss >= 0 ? '+' : '') + fmt(totalGanLoss)}</div></div>
        </div>
        <div className="inv-stat">
          <div className="inv-stat__icon" style={{ background: 'rgba(83,74,183,0.12)' }}><Layers size={16} color="var(--purple)" /></div>
          <div><div className="inv-stat__label">Posiciones</div><div className="inv-stat__value" style={{ color: 'var(--purple)' }}>{inversiones.length}</div></div>
        </div>
      </div>

      {error && <div className="inv-error-banner">⚠ {error}</div>}

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
                <input type="text" maxLength={10} className={`inv-input ${errors.ticker ? 'inv-input--error' : ''}`} placeholder="Ej. AAPL" value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))} />
                {errors.ticker && <span className="inv-error">{errors.ticker}</span>}
              </div>
              <div className="inv-field">
                <label className="inv-label">Nombre</label>
                <input type="text" className={`inv-input ${errors.nombre ? 'inv-input--error' : ''}`} placeholder="Ej. Apple Inc." value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                {errors.nombre && <span className="inv-error">{errors.nombre}</span>}
              </div>
            </div>
            <div className="inv-form__row">
              <div className="inv-field">
                <label className="inv-label">Precio actual ($)</label>
                <input type="number" min="0" step="0.01" className={`inv-input ${errors.precioActual ? 'inv-input--error' : ''}`} placeholder="0.00" value={form.precioActual} onChange={e => setForm(f => ({ ...f, precioActual: e.target.value }))} />
                {errors.precioActual && <span className="inv-error">{errors.precioActual}</span>}
              </div>
              <div className="inv-field">
                <label className="inv-label">Precio compra ($)</label>
                <input type="number" min="0" step="0.01" className={`inv-input ${errors.precioCompra ? 'inv-input--error' : ''}`} placeholder="0.00" value={form.precioCompra} onChange={e => setForm(f => ({ ...f, precioCompra: e.target.value }))} />
                {errors.precioCompra && <span className="inv-error">{errors.precioCompra}</span>}
              </div>
            </div>
            <div className="inv-form__row">
              <div className="inv-field">
                <label className="inv-label">Cantidad</label>
                <input type="number" min="0" step="any" className={`inv-input ${errors.cantidad ? 'inv-input--error' : ''}`} placeholder="0" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
                {errors.cantidad && <span className="inv-error">{errors.cantidad}</span>}
              </div>
              <div className="inv-field">
                <label className="inv-label">Variación día (%)</label>
                <input type="number" step="0.01" className="inv-input" placeholder="0.00" value={form.variacionDia} onChange={e => setForm(f => ({ ...f, variacionDia: e.target.value }))} />
              </div>
            </div>
            <div className="inv-form__actions">
              <button type="button" className="inv-btn inv-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="inv-btn inv-btn--accent" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Agregar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="inv-loading"><Loader2 size={20} className="spin" /> Cargando...</div>
      ) : (
        <div className="inv-list">
          {inversiones.map(inv => {
            const val    = inv.precio_actual * inv.cantidad
            const gan    = (inv.precio_actual - inv.precio_compra) * inv.cantidad
            const ganPct = ((inv.precio_actual - inv.precio_compra) / inv.precio_compra) * 100
            const sube   = inv.variacion_dia >= 0
            const lineColor = sube ? 'var(--green)' : 'var(--red)'
            const hist   = historiales[inv.id] ?? []
            return (
              <div key={inv.id} className="inv-card">
                <div className="inv-card__top">
                  <div className="inv-card__left">
                    <div className="inv-card__ticker-wrap"><span className="inv-card__ticker">{inv.ticker}</span></div>
                    <div>
                      <div className="inv-card__nombre">{inv.nombre}</div>
                      <div className="inv-card__meta">{inv.cantidad} unidades · compra {fmt(inv.precio_compra)}</div>
                    </div>
                  </div>
                  <div className="inv-card__right">
                    <div className="inv-card__precio">{fmt(inv.precio_actual)}</div>
                    <div className={`inv-card__variacion ${sube ? 'inv-card__variacion--pos' : 'inv-card__variacion--neg'}`}>
                      {sube ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {fmtPct(inv.variacion_dia)}
                    </div>
                  </div>
                </div>
                {hist.length > 0 && (
                  <div className="inv-card__spark">
                    <ResponsiveContainer width="100%" height={52}>
                      <LineChart data={hist} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
                        <ReferenceLine y={hist[0].v} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                        <Tooltip content={<SparkTooltip />} />
                        <Line type="monotone" dataKey="v" stroke={lineColor} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: lineColor }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="inv-card__bottom">
                  <div className="inv-card__monto-item"><span className="inv-card__monto-label">Valor posición</span><span className="inv-card__monto-val" style={{ color: 'var(--purple)' }}>{fmt(val)}</span></div>
                  <div className="inv-card__monto-item inv-card__monto-item--center"><span className="inv-card__monto-label">Gan./Pérd. total</span><span className="inv-card__monto-val" style={{ color: gan >= 0 ? 'var(--green)' : 'var(--red)' }}>{gan >= 0 ? '+' : ''}{fmt(gan)}</span></div>
                  <div className="inv-card__monto-item inv-card__monto-item--right"><span className="inv-card__monto-label">Rentabilidad</span><span className="inv-card__monto-val" style={{ color: ganPct >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPct(ganPct)}</span></div>
                </div>
              </div>
            )
          })}
          {inversiones.length === 0 && <div className="inv-loading" style={{ color: 'var(--text-muted)' }}>Sin posiciones registradas</div>}
        </div>
      )}
    </div>
  )
}
