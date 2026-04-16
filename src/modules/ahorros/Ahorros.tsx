import { useState, useMemo } from 'react'
import { Plus, PiggyBank, Target, CheckCircle2, X } from 'lucide-react'
import './Ahorros.css'

interface Meta {
  id: string
  nombre: string
  montoObjetivo: number
  montoActual: number
  fechaObjetivo: string
}

const MOCK: Meta[] = [
  { id: '1', nombre: 'Fondo de emergencia', montoObjetivo: 50000, montoActual: 28000, fechaObjetivo: '2026-09-01' },
  { id: '2', nombre: 'Viaje a Japón',       montoObjetivo: 80000, montoActual: 15000, fechaObjetivo: '2027-03-15' },
  { id: '3', nombre: 'MacBook Pro',         montoObjetivo: 45000, montoActual: 45000, fechaObjetivo: '2026-04-01' },
]

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}
function pct(actual: number, objetivo: number) {
  return Math.min(100, Math.round((actual / objetivo) * 100))
}
function semanasHasta(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)))
}

const HOY = new Date().toISOString().slice(0, 10)

export default function Ahorros() {
  const [metas, setMetas]       = useState<Meta[]>(MOCK)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ nombre: '', montoObjetivo: '', montoActual: '', fechaObjetivo: HOY })
  const [errors, setErrors]     = useState<Partial<typeof form>>({})

  const totalAhorrado  = useMemo(() => metas.reduce((s, m) => s + m.montoActual, 0), [metas])
  const metasActivas   = useMemo(() => metas.filter(m => m.montoActual < m.montoObjetivo).length, [metas])
  const metasCumplidas = useMemo(() => metas.filter(m => m.montoActual >= m.montoObjetivo).length, [metas])

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.montoObjetivo || Number(form.montoObjetivo) <= 0) e.montoObjetivo = 'Monto inválido'
    if (!form.fechaObjetivo) e.fechaObjetivo = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const nueva: Meta = {
      id: Date.now().toString(),
      nombre: form.nombre.trim(),
      montoObjetivo: Number(form.montoObjetivo),
      montoActual: Number(form.montoActual) || 0,
      fechaObjetivo: form.fechaObjetivo,
    }
    setMetas(prev => [...prev, nueva])
    setForm({ nombre: '', montoObjetivo: '', montoActual: '', fechaObjetivo: HOY })
    setErrors({})
    setShowForm(false)
  }

  return (
    <div className="aho-page">

      <div className="aho-header">
        <div>
          <h1 className="aho-title">Ahorros</h1>
          <p className="aho-subtitle">Metas financieras</p>
        </div>
        <button className="aho-btn aho-btn--accent" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} /> Nueva Meta
        </button>
      </div>

      <div className="aho-summary">
        <div className="aho-stat">
          <div className="aho-stat__icon" style={{ background: 'rgba(29,158,117,0.12)' }}><PiggyBank size={16} color="var(--green)" /></div>
          <div><div className="aho-stat__label">Total ahorrado</div><div className="aho-stat__value" style={{ color: 'var(--green)' }}>{fmt(totalAhorrado)}</div></div>
        </div>
        <div className="aho-stat">
          <div className="aho-stat__icon" style={{ background: 'rgba(55,138,221,0.12)' }}><Target size={16} color="var(--blue)" /></div>
          <div><div className="aho-stat__label">Metas activas</div><div className="aho-stat__value" style={{ color: 'var(--blue)' }}>{metasActivas}</div></div>
        </div>
        <div className="aho-stat">
          <div className="aho-stat__icon" style={{ background: 'rgba(29,158,117,0.12)' }}><CheckCircle2 size={16} color="var(--green)" /></div>
          <div><div className="aho-stat__label">Metas cumplidas</div><div className="aho-stat__value" style={{ color: 'var(--green)' }}>{metasCumplidas}</div></div>
        </div>
      </div>

      {showForm && (
        <div className="aho-form-wrap">
          <div className="aho-form-header">
            <span>Nueva meta de ahorro</span>
            <button className="aho-close" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form className="aho-form" onSubmit={handleSubmit} noValidate>
            <div className="aho-field">
              <label className="aho-label">Nombre de la meta</label>
              <input type="text" className={`aho-input ${errors.nombre ? 'aho-input--error' : ''}`} placeholder="Ej. Fondo de emergencia" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              {errors.nombre && <span className="aho-error">{errors.nombre}</span>}
            </div>
            <div className="aho-form__row">
              <div className="aho-field">
                <label className="aho-label">Monto objetivo ($)</label>
                <input type="number" min="0" step="0.01" className={`aho-input ${errors.montoObjetivo ? 'aho-input--error' : ''}`} placeholder="0.00" value={form.montoObjetivo} onChange={e => setForm(f => ({ ...f, montoObjetivo: e.target.value }))} />
                {errors.montoObjetivo && <span className="aho-error">{errors.montoObjetivo}</span>}
              </div>
              <div className="aho-field">
                <label className="aho-label">Monto actual ($)</label>
                <input type="number" min="0" step="0.01" className="aho-input" placeholder="0.00" value={form.montoActual} onChange={e => setForm(f => ({ ...f, montoActual: e.target.value }))} />
              </div>
            </div>
            <div className="aho-field">
              <label className="aho-label">Fecha objetivo</label>
              <input type="date" className={`aho-input ${errors.fechaObjetivo ? 'aho-input--error' : ''}`} value={form.fechaObjetivo} onChange={e => setForm(f => ({ ...f, fechaObjetivo: e.target.value }))} />
              {errors.fechaObjetivo && <span className="aho-error">{errors.fechaObjetivo}</span>}
            </div>
            <div className="aho-form__actions">
              <button type="button" className="aho-btn aho-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="aho-btn aho-btn--accent"><Plus size={14} /> Crear Meta</button>
            </div>
          </form>
        </div>
      )}

      <div className="aho-list">
        {metas.map(m => {
          const porcentaje = pct(m.montoActual, m.montoObjetivo)
          const cumplida   = m.montoActual >= m.montoObjetivo
          const falta      = Math.max(0, m.montoObjetivo - m.montoActual)
          const semanas    = semanasHasta(m.fechaObjetivo)
          const porSemana  = semanas > 0 ? falta / semanas : 0
          return (
            <div key={m.id} className={`aho-card ${cumplida ? 'aho-card--cumplida' : ''}`}>
              <div className="aho-card__top">
                <div className="aho-card__left">
                  <div className="aho-card__icon">
                    {cumplida
                      ? <CheckCircle2 size={16} color="var(--green)" />
                      : <Target size={16} color="var(--green)" />}
                  </div>
                  <div>
                    <div className="aho-card__nombre">{m.nombre}</div>
                    <div className="aho-card__meta-fecha">Fecha objetivo: {fmtFecha(m.fechaObjetivo)}</div>
                  </div>
                </div>
                {cumplida && <span className="aho-badge aho-badge--cumplida">Cumplida</span>}
              </div>

              <div className="aho-card__montos">
                <div className="aho-card__monto-item">
                  <span className="aho-card__monto-label">Objetivo</span>
                  <span className="aho-card__monto-val">{fmt(m.montoObjetivo)}</span>
                </div>
                <div className="aho-card__monto-item">
                  <span className="aho-card__monto-label">Ahorrado</span>
                  <span className="aho-card__monto-val" style={{ color: 'var(--green)' }}>{fmt(m.montoActual)}</span>
                </div>
                <div className="aho-card__monto-item">
                  <span className="aho-card__monto-label">Falta</span>
                  <span className="aho-card__monto-val" style={{ color: cumplida ? 'var(--green)' : 'var(--text-secondary)' }}>
                    {cumplida ? '¡Logrado!' : fmt(falta)}
                  </span>
                </div>
              </div>

              <div className="aho-progress-wrap">
                <div className="aho-progress-bar">
                  <div className="aho-progress-fill" style={{ width: `${porcentaje}%`, background: cumplida ? 'var(--green)' : 'var(--green)' }} />
                </div>
                <span className="aho-progress-pct">{porcentaje}%</span>
              </div>

              {!cumplida && semanas > 0 && (
                <div className="aho-card__footer">
                  <span className="aho-card__ritmo">
                    Ahorrar <strong>{fmt(porSemana)}/semana</strong> para llegar en {semanas} semanas
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
