import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, PiggyBank, Target, CheckCircle2, X, Loader2 } from 'lucide-react'
import { fetchAhorros, insertAhorro, updateAhorro } from '../../lib/db'
import type { AhorroRow } from '../../lib/types'
import './Ahorros.css'

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
  const [metas, setMetas]     = useState<AhorroRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ nombre: '', montoObjetivo: '', montoActual: '', fechaObjetivo: HOY })
  const [errors, setErrors]     = useState<Partial<typeof form>>({})

  // Inline editing of monto_objetivo
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')
  const editInputRef                = useRef<HTMLInputElement>(null)

  async function cargar() {
    try {
      setLoading(true); setError(null)
      setMetas(await fetchAhorros())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  const totalAhorrado  = useMemo(() => metas.reduce((s, m) => s + m.monto_actual, 0), [metas])
  const metasActivas   = useMemo(() => metas.filter(m => m.monto_actual < m.monto_objetivo).length, [metas])
  const metasCumplidas = useMemo(() => metas.filter(m => m.monto_actual >= m.monto_objetivo).length, [metas])

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.montoObjetivo || Number(form.montoObjetivo) <= 0) e.montoObjetivo = 'Monto inválido'
    if (!form.fechaObjetivo) e.fechaObjetivo = 'Requerido'
    setErrors(e); return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      setSaving(true)
      await insertAhorro({
        nombre: form.nombre.trim(),
        monto_objetivo: Number(form.montoObjetivo),
        monto_actual: Number(form.montoActual) || 0,
        fecha_objetivo: form.fechaObjetivo || null,
      })
      await cargar()
      setForm({ nombre: '', montoObjetivo: '', montoActual: '', fechaObjetivo: HOY })
      setErrors({}); setShowForm(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(m: AhorroRow) {
    setEditingId(m.id)
    setEditValue(String(m.monto_objetivo))
  }

  async function commitEdit(id: string) {
    const val = Number(editValue)
    setEditingId(null)
    if (isNaN(val) || val < 0) return
    const current = metas.find(m => m.id === id)
    if (!current || val === current.monto_objetivo) return
    try {
      const updated = await updateAhorro(id, { monto_objetivo: val })
      setMetas(prev => prev.map(m => m.id === id ? updated : m))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitEdit(id)
    if (e.key === 'Escape') setEditingId(null)
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
          <div><div className="aho-stat__label">Total ahorrado</div><div className="aho-stat__value" style={{ color: 'var(--green)' }}>{loading ? '—' : fmt(totalAhorrado)}</div></div>
        </div>
        <div className="aho-stat">
          <div className="aho-stat__icon" style={{ background: 'rgba(55,138,221,0.12)' }}><Target size={16} color="var(--blue)" /></div>
          <div><div className="aho-stat__label">Metas activas</div><div className="aho-stat__value" style={{ color: 'var(--blue)' }}>{loading ? '—' : metasActivas}</div></div>
        </div>
        <div className="aho-stat">
          <div className="aho-stat__icon" style={{ background: 'rgba(29,158,117,0.12)' }}><CheckCircle2 size={16} color="var(--green)" /></div>
          <div><div className="aho-stat__label">Metas cumplidas</div><div className="aho-stat__value" style={{ color: 'var(--green)' }}>{loading ? '—' : metasCumplidas}</div></div>
        </div>
      </div>

      {error && <div className="aho-error-banner">⚠ {error}</div>}

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
              <button type="submit" className="aho-btn aho-btn--accent" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Crear Meta
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="aho-loading"><Loader2 size={20} className="spin" /> Cargando...</div>
      ) : (
        <div className="aho-list">
          {metas.map(m => {
            const porcentaje = m.monto_objetivo > 0 ? pct(m.monto_actual, m.monto_objetivo) : 0
            const cumplida   = m.monto_objetivo > 0 && m.monto_actual >= m.monto_objetivo
            const falta      = Math.max(0, m.monto_objetivo - m.monto_actual)
            const semanas    = m.fecha_objetivo ? semanasHasta(m.fecha_objetivo) : 0
            const porSemana  = semanas > 0 ? falta / semanas : 0
            const isEditing  = editingId === m.id
            return (
              <div key={m.id} className={`aho-card ${cumplida ? 'aho-card--cumplida' : ''}`}>
                <div className="aho-card__top">
                  <div className="aho-card__left">
                    <div className="aho-card__icon">
                      {cumplida ? <CheckCircle2 size={16} color="var(--green)" /> : <Target size={16} color="var(--green)" />}
                    </div>
                    <div>
                      <div className="aho-card__nombre">{m.nombre}</div>
                      {m.fecha_objetivo && <div className="aho-card__meta-fecha">Fecha objetivo: {fmtFecha(m.fecha_objetivo)}</div>}
                    </div>
                  </div>
                  {cumplida && <span className="aho-badge aho-badge--cumplida">Cumplida</span>}
                </div>
                <div className="aho-card__montos">
                  <div className="aho-card__monto-item">
                    <span className="aho-card__monto-label">Objetivo</span>
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        className="aho-inline-input"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(m.id)}
                        onKeyDown={e => handleEditKeyDown(e, m.id)}
                      />
                    ) : (
                      <span
                        className="aho-card__monto-val aho-card__monto-val--editable"
                        onClick={() => startEdit(m)}
                        title="Click para editar objetivo"
                      >
                        {fmt(m.monto_objetivo)}
                      </span>
                    )}
                  </div>
                  <div className="aho-card__monto-item"><span className="aho-card__monto-label">Ahorrado</span><span className="aho-card__monto-val" style={{ color: 'var(--green)' }}>{fmt(m.monto_actual)}</span></div>
                  <div className="aho-card__monto-item"><span className="aho-card__monto-label">Falta</span><span className="aho-card__monto-val" style={{ color: cumplida ? 'var(--green)' : 'var(--text-secondary)' }}>{cumplida ? '¡Logrado!' : fmt(falta)}</span></div>
                </div>
                <div className="aho-progress-wrap">
                  <div className="aho-progress-bar"><div className="aho-progress-fill" style={{ width: `${porcentaje}%` }} /></div>
                  <span className="aho-progress-pct">{porcentaje}%</span>
                </div>
                {!cumplida && semanas > 0 && (
                  <div className="aho-card__footer">
                    <span className="aho-card__ritmo">Ahorrar <strong>{fmt(porSemana)}/semana</strong> para llegar en {semanas} semanas</span>
                  </div>
                )}
              </div>
            )
          })}
          {metas.length === 0 && <div className="aho-loading" style={{ color: 'var(--text-muted)' }}>Sin metas registradas</div>}
        </div>
      )}
    </div>
  )
}
