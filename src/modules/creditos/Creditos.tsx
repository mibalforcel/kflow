import { useState, useEffect, useMemo } from 'react'
import { Plus, CreditCard, DollarSign, AlertCircle, X, AlertTriangle, Loader2 } from 'lucide-react'
import { fetchCreditos, insertCredito } from '../../lib/db'
import type { CreditoRow, Estrategia } from '../../lib/types'
import './Creditos.css'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}
function pct(pagado: number, total: number) {
  return Math.min(100, Math.round((pagado / total) * 100))
}

const HOY = new Date().toISOString().slice(0, 10)

export default function Creditos() {
  const [deudas, setDeudas]   = useState<CreditoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({
    nombre: '', montoTotal: '', montoPagado: '', tasaInteres: '', proximoPago: HOY, estrategia: 'Snowball' as Estrategia
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  async function cargar() {
    try {
      setLoading(true); setError(null)
      setDeudas(await fetchCreditos())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const totalAdeudado = useMemo(() => deudas.reduce((s, d) => s + (d.monto_total - d.monto_pagado), 0), [deudas])
  const totalAbonado  = useMemo(() => deudas.reduce((s, d) => s + d.monto_pagado, 0), [deudas])
  const proximoPago   = useMemo(() => {
    const sorted = [...deudas].filter(d => d.proximo_pago).sort((a, b) => a.proximo_pago!.localeCompare(b.proximo_pago!))
    return sorted[0] ?? null
  }, [deudas])

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.montoTotal || Number(form.montoTotal) <= 0) e.montoTotal = 'Monto inválido'
    if (!form.proximoPago) e.proximoPago = 'Requerido'
    setErrors(e); return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      setSaving(true)
      await insertCredito({
        nombre: form.nombre.trim(),
        monto_total: Number(form.montoTotal),
        monto_pagado: Number(form.montoPagado) || 0,
        tasa_interes: Number(form.tasaInteres) || 0,
        proximo_pago: form.proximoPago || null,
        estrategia: form.estrategia,
      })
      await cargar()
      setForm({ nombre: '', montoTotal: '', montoPagado: '', tasaInteres: '', proximoPago: HOY, estrategia: 'Snowball' })
      setErrors({}); setShowForm(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cre-page">

      <div className="cre-header">
        <div>
          <h1 className="cre-title">Créditos</h1>
          <p className="cre-subtitle">Gestión de deudas</p>
        </div>
        <button className="cre-btn cre-btn--accent" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} /> Nueva Deuda
        </button>
      </div>

      <div className="cre-summary">
        <div className="cre-stat">
          <div className="cre-stat__icon" style={{ background: 'rgba(226,75,74,0.12)' }}><AlertCircle size={16} color="var(--red)" /></div>
          <div><div className="cre-stat__label">Total adeudado</div><div className="cre-stat__value" style={{ color: 'var(--red)' }}>{loading ? '—' : fmt(totalAdeudado)}</div></div>
        </div>
        <div className="cre-stat">
          <div className="cre-stat__icon" style={{ background: 'rgba(55,138,221,0.12)' }}><DollarSign size={16} color="var(--blue)" /></div>
          <div><div className="cre-stat__label">Total abonado</div><div className="cre-stat__value" style={{ color: 'var(--blue)' }}>{loading ? '—' : fmt(totalAbonado)}</div></div>
        </div>
        <div className="cre-stat">
          <div className="cre-stat__icon" style={{ background: 'rgba(212,160,23,0.12)' }}><CreditCard size={16} color="var(--gold)" /></div>
          <div>
            <div className="cre-stat__label">Próximo pago</div>
            <div className="cre-stat__value" style={{ color: 'var(--gold)' }}>
              {loading ? '—' : proximoPago
                ? `${fmt(proximoPago.monto_total - proximoPago.monto_pagado)} — ${fmtFecha(proximoPago.proximo_pago!)}`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="cre-error-banner">⚠ {error}</div>}

      {showForm && (
        <div className="cre-form-wrap">
          <div className="cre-form-header">
            <span>Nueva deuda</span>
            <button className="cre-close" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form className="cre-form" onSubmit={handleSubmit} noValidate>
            <div className="cre-form__row">
              <div className="cre-field">
                <label className="cre-label">Nombre del crédito</label>
                <input type="text" className={`cre-input ${errors.nombre ? 'cre-input--error' : ''}`} placeholder="Ej. Tarjeta Capital One" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                {errors.nombre && <span className="cre-error">{errors.nombre}</span>}
              </div>
              <div className="cre-field">
                <label className="cre-label">Estrategia</label>
                <select className="cre-input cre-select" value={form.estrategia} onChange={e => setForm(f => ({ ...f, estrategia: e.target.value as Estrategia }))}>
                  <option>Snowball</option><option>Avalanche</option>
                </select>
              </div>
            </div>
            <div className="cre-form__row">
              <div className="cre-field">
                <label className="cre-label">Monto total ($)</label>
                <input type="number" min="0" step="0.01" className={`cre-input ${errors.montoTotal ? 'cre-input--error' : ''}`} placeholder="0.00" value={form.montoTotal} onChange={e => setForm(f => ({ ...f, montoTotal: e.target.value }))} />
                {errors.montoTotal && <span className="cre-error">{errors.montoTotal}</span>}
              </div>
              <div className="cre-field">
                <label className="cre-label">Monto pagado ($)</label>
                <input type="number" min="0" step="0.01" className="cre-input" placeholder="0.00" value={form.montoPagado} onChange={e => setForm(f => ({ ...f, montoPagado: e.target.value }))} />
              </div>
            </div>
            <div className="cre-form__row">
              <div className="cre-field">
                <label className="cre-label">Tasa interés (%)</label>
                <input type="number" min="0" step="0.1" className="cre-input" placeholder="0.0" value={form.tasaInteres} onChange={e => setForm(f => ({ ...f, tasaInteres: e.target.value }))} />
              </div>
              <div className="cre-field">
                <label className="cre-label">Próximo pago</label>
                <input type="date" className={`cre-input ${errors.proximoPago ? 'cre-input--error' : ''}`} value={form.proximoPago} onChange={e => setForm(f => ({ ...f, proximoPago: e.target.value }))} />
                {errors.proximoPago && <span className="cre-error">{errors.proximoPago}</span>}
              </div>
            </div>
            <div className="cre-form__actions">
              <button type="button" className="cre-btn cre-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="cre-btn cre-btn--accent" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Agregar Deuda
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="cre-loading"><Loader2 size={20} className="spin" /> Cargando...</div>
      ) : (
        <div className="cre-list">
          {deudas.map(d => {
            const pendiente  = d.monto_total - d.monto_pagado
            const porcentaje = pct(d.monto_pagado, d.monto_total)
            return (
              <div key={d.id} className="cre-card">
                <div className="cre-card__top">
                  <div className="cre-card__left">
                    <div className="cre-card__icon"><CreditCard size={16} color="var(--blue)" /></div>
                    <div>
                      <div className="cre-card__nombre">{d.nombre}</div>
                      <div className="cre-card__meta">Tasa: {d.tasa_interes}% anual</div>
                    </div>
                  </div>
                  <div className="cre-card__right">
                    <span className={`cre-badge cre-badge--${(d.estrategia ?? 'snowball').toLowerCase()}`}>{d.estrategia}</span>
                  </div>
                </div>
                <div className="cre-card__montos">
                  <div className="cre-card__monto-item"><span className="cre-card__monto-label">Total</span><span className="cre-card__monto-val">{fmt(d.monto_total)}</span></div>
                  <div className="cre-card__monto-item"><span className="cre-card__monto-label">Pagado</span><span className="cre-card__monto-val" style={{ color: 'var(--blue)' }}>{fmt(d.monto_pagado)}</span></div>
                  <div className="cre-card__monto-item"><span className="cre-card__monto-label">Pendiente</span><span className="cre-card__monto-val" style={{ color: 'var(--red)' }}>{fmt(pendiente)}</span></div>
                </div>
                <div className="cre-progress-wrap">
                  <div className="cre-progress-bar"><div className="cre-progress-fill" style={{ width: `${porcentaje}%` }} /></div>
                  <span className="cre-progress-pct">{porcentaje}%</span>
                </div>
                {d.proximo_pago && (
                  <div className="cre-card__footer">
                    <AlertTriangle size={13} color="var(--gold)" />
                    <span className="cre-card__vence">Próximo pago: {fmtFecha(d.proximo_pago)}</span>
                  </div>
                )}
              </div>
            )
          })}
          {deudas.length === 0 && <div className="cre-loading" style={{ color: 'var(--text-muted)' }}>Sin créditos registrados</div>}
        </div>
      )}
    </div>
  )
}
