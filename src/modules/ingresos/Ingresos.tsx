import { useState, useEffect, useMemo } from 'react'
import { Plus, TrendingUp, Calendar, Hash, AlertTriangle, X, Check, Loader2 } from 'lucide-react'
import { fetchIngresos, insertIngreso } from '../../lib/db'
import type { IngresoRow, Fuente } from '../../lib/types'
import './Ingresos.css'

const FUENTE_CONFIG: Record<Fuente, { color: string; bg: string; label: string }> = {
  "K'Drive": { color: 'var(--gold)',  bg: 'rgba(212,160,23,0.15)',  label: "K'Drive" },
  'Manual':  { color: 'var(--green)', bg: 'rgba(29,158,117,0.15)',  label: 'Manual' },
  'Otro':    { color: 'var(--blue)',  bg: 'rgba(55,138,221,0.15)',  label: 'Otro' },
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}

const HOY = new Date().toISOString().slice(0, 10)
const MES_ACTUAL = HOY.slice(0, 7)

export default function Ingresos() {
  const [ingresos, setIngresos] = useState<IngresoRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  const [form, setForm]       = useState({ fecha: HOY, descripcion: '', monto: '', fuente: "K'Drive" as Fuente })
  const [errors, setErrors]   = useState<Partial<typeof form>>({})
  const [showForm, setShowForm] = useState(false)
  const [duplicado, setDuplicado]       = useState<IngresoRow | null>(null)
  const [pendingInsert, setPendingInsert] = useState<typeof form | null>(null)

  async function cargar() {
    try {
      setLoading(true); setError(null)
      setIngresos(await fetchIngresos())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const totalMes = useMemo(() => ingresos.filter(i => i.fecha.startsWith(MES_ACTUAL)).reduce((s, i) => s + i.monto, 0), [ingresos])
  const totalHoy = useMemo(() => ingresos.filter(i => i.fecha === HOY).reduce((s, i) => s + i.monto, 0), [ingresos])
  const txMes    = useMemo(() => ingresos.filter(i => i.fecha.startsWith(MES_ACTUAL)).length, [ingresos])
  const lista    = useMemo(() => [...ingresos].sort((a, b) => b.fecha.localeCompare(a.fecha)), [ingresos])

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.fecha) e.fecha = 'Requerido'
    if (!form.descripcion.trim()) e.descripcion = 'Requerido'
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) e.monto = 'Monto inválido'
    setErrors(e); return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const monto = Number(form.monto)
    const dup = ingresos.find(i => i.fecha === form.fecha && i.monto === monto)
    if (dup) { setDuplicado(dup); setPendingInsert({ ...form }); return }
    agregar(form)
  }

  async function agregar(f: typeof form) {
    try {
      setSaving(true)
      await insertIngreso({ fecha: f.fecha, descripcion: f.descripcion.trim(), fuente: f.fuente, monto: Number(f.monto) })
      await cargar()
      setForm({ fecha: HOY, descripcion: '', monto: '', fuente: "K'Drive" })
      setErrors({}); setShowForm(false); setDuplicado(null); setPendingInsert(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const mesLabel = new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  return (
    <div className="ing-page">

      {duplicado && (
        <div className="ing-overlay">
          <div className="ing-dialog">
            <div className="ing-dialog__icon"><AlertTriangle size={22} color="var(--gold)" /></div>
            <h3 className="ing-dialog__title">Ingreso similar detectado</h3>
            <p className="ing-dialog__body">
              Ya existe un ingreso de <strong>{fmt(duplicado.monto)}</strong> el <strong>{fmtFecha(duplicado.fecha)}</strong> — «{duplicado.descripcion}».
              <br /><br />¿Deseas agregarlo de todas formas?
            </p>
            <div className="ing-dialog__actions">
              <button className="ing-btn ing-btn--ghost" onClick={() => { setDuplicado(null); setPendingInsert(null) }}>
                <X size={14} /> Cancelar
              </button>
              <button className="ing-btn ing-btn--gold" disabled={saving} onClick={() => pendingInsert && agregar(pendingInsert)}>
                <Check size={14} /> Sí, agregar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ing-header">
        <div>
          <h1 className="ing-title">Ingresos</h1>
          <p className="ing-subtitle" style={{ textTransform: 'capitalize' }}>{mesLabel}</p>
        </div>
        <button className="ing-btn ing-btn--gold" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} /> Agregar Ingreso
        </button>
      </div>

      <div className="ing-summary">
        <div className="ing-stat">
          <div className="ing-stat__icon" style={{ background: 'rgba(29,158,117,0.12)' }}><TrendingUp size={16} color="var(--green)" /></div>
          <div><div className="ing-stat__label">Total del mes</div><div className="ing-stat__value" style={{ color: 'var(--green)' }}>{loading ? '—' : fmt(totalMes)}</div></div>
        </div>
        <div className="ing-stat">
          <div className="ing-stat__icon" style={{ background: 'rgba(212,160,23,0.12)' }}><Calendar size={16} color="var(--gold)" /></div>
          <div><div className="ing-stat__label">Total de hoy</div><div className="ing-stat__value" style={{ color: 'var(--gold)' }}>{loading ? '—' : fmt(totalHoy)}</div></div>
        </div>
        <div className="ing-stat">
          <div className="ing-stat__icon" style={{ background: 'rgba(55,138,221,0.12)' }}><Hash size={16} color="var(--blue)" /></div>
          <div><div className="ing-stat__label">Transacciones</div><div className="ing-stat__value" style={{ color: 'var(--blue)' }}>{loading ? '—' : txMes}</div></div>
        </div>
      </div>

      {error && <div className="ing-error-banner">⚠ {error}</div>}

      {showForm && (
        <div className="ing-form-wrap">
          <div className="ing-form-header">
            <span>Nuevo ingreso manual</span>
            <button className="ing-close" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form className="ing-form" onSubmit={handleSubmit} noValidate>
            <div className="ing-form__row">
              <div className="ing-field">
                <label className="ing-label">Fecha</label>
                <input type="date" className={`ing-input ${errors.fecha ? 'ing-input--error' : ''}`} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                {errors.fecha && <span className="ing-error">{errors.fecha}</span>}
              </div>
              <div className="ing-field">
                <label className="ing-label">Fuente</label>
                <select className="ing-input ing-select" value={form.fuente} onChange={e => setForm(f => ({ ...f, fuente: e.target.value as Fuente }))}>
                  <option>K'Drive</option><option>Manual</option><option>Otro</option>
                </select>
              </div>
            </div>
            <div className="ing-field">
              <label className="ing-label">Descripción</label>
              <input type="text" className={`ing-input ${errors.descripcion ? 'ing-input--error' : ''}`} placeholder="Ej. Pago cliente Empresa XYZ" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              {errors.descripcion && <span className="ing-error">{errors.descripcion}</span>}
            </div>
            <div className="ing-field">
              <label className="ing-label">Monto ($)</label>
              <input type="number" min="0" step="0.01" className={`ing-input ${errors.monto ? 'ing-input--error' : ''}`} placeholder="0.00" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
              {errors.monto && <span className="ing-error">{errors.monto}</span>}
            </div>
            <div className="ing-form__actions">
              <button type="button" className="ing-btn ing-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="ing-btn ing-btn--gold" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Agregar Ingreso
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="ing-table-wrap">
        {loading ? (
          <div className="ing-empty"><Loader2 size={20} className="spin" style={{ marginBottom: 8 }} /><br />Cargando...</div>
        ) : (
          <table className="ing-table">
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Fuente</th><th className="ing-th--right">Monto</th></tr></thead>
            <tbody>
              {lista.map(ing => {
                const cfg = FUENTE_CONFIG[ing.fuente]
                return (
                  <tr key={ing.id} className="ing-row">
                    <td className="ing-td--fecha">{fmtFecha(ing.fecha)}</td>
                    <td className="ing-td--desc">{ing.descripcion}</td>
                    <td><span className="ing-badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
                    <td className="ing-td--monto">{fmt(ing.monto)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && lista.length === 0 && <div className="ing-empty">Sin ingresos registrados</div>}
      </div>
    </div>
  )
}
