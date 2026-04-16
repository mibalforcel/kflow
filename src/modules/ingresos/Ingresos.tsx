import { useState, useMemo } from 'react'
import { Plus, TrendingUp, Calendar, Hash, AlertTriangle, X, Check } from 'lucide-react'
import './Ingresos.css'

type Fuente = 'K\'Drive' | 'Manual' | 'Otro'

interface Ingreso {
  id: string
  fecha: string
  descripcion: string
  fuente: Fuente
  monto: number
}

const MOCK_INGRESOS: Ingreso[] = [
  { id: '1', fecha: '2026-04-16', descripcion: 'Pago cliente Empresa ABC', fuente: "K'Drive", monto: 8500 },
  { id: '2', fecha: '2026-04-15', descripcion: 'Freelance diseño web', fuente: 'Manual', monto: 3200 },
  { id: '3', fecha: '2026-04-12', descripcion: 'Consultoría mensual', fuente: "K'Drive", monto: 6800 },
  { id: '4', fecha: '2026-04-10', descripcion: 'Venta de curso online', fuente: 'Otro', monto: 1450 },
  { id: '5', fecha: '2026-04-05', descripcion: 'Pago proyecto Kairos', fuente: "K'Drive", monto: 12000 },
  { id: '6', fecha: '2026-04-03', descripcion: 'Dividendos inversión', fuente: 'Otro', monto: 890 },
  { id: '7', fecha: '2026-04-01', descripcion: 'Bono mensual', fuente: 'Manual', monto: 2500 },
]

const FUENTE_CONFIG: Record<Fuente, { color: string; bg: string; label: string }> = {
  "K'Drive": { color: 'var(--gold)', bg: 'rgba(212,160,23,0.15)', label: "K'Drive" },
  'Manual':  { color: 'var(--green)', bg: 'rgba(29,158,117,0.15)', label: 'Manual' },
  'Otro':    { color: 'var(--blue)', bg: 'rgba(55,138,221,0.15)', label: 'Otro' },
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const HOY = new Date().toISOString().slice(0, 10)
const MES_ACTUAL = HOY.slice(0, 7)

export default function Ingresos() {
  const [ingresos, setIngresos] = useState<Ingreso[]>(MOCK_INGRESOS)

  // Form state
  const [form, setForm] = useState({ fecha: HOY, descripcion: '', monto: '', fuente: "K'Drive" as Fuente })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [showForm, setShowForm] = useState(false)

  // Duplicado
  const [duplicado, setDuplicado] = useState<Ingreso | null>(null)
  const [pendingIngreso, setPendingIngreso] = useState<Ingreso | null>(null)

  // Resumen
  const totalMes = useMemo(
    () => ingresos.filter(i => i.fecha.startsWith(MES_ACTUAL)).reduce((s, i) => s + i.monto, 0),
    [ingresos]
  )
  const totalHoy = useMemo(
    () => ingresos.filter(i => i.fecha === HOY).reduce((s, i) => s + i.monto, 0),
    [ingresos]
  )
  const txMes = useMemo(
    () => ingresos.filter(i => i.fecha.startsWith(MES_ACTUAL)).length,
    [ingresos]
  )

  // Lista ordenada
  const lista = useMemo(
    () => [...ingresos].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [ingresos]
  )

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.fecha) e.fecha = 'Requerido'
    if (!form.descripcion.trim()) e.descripcion = 'Requerido'
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) e.monto = 'Monto inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const monto = Number(form.monto)
    const nuevo: Ingreso = {
      id: Date.now().toString(),
      fecha: form.fecha,
      descripcion: form.descripcion.trim(),
      fuente: form.fuente,
      monto,
    }

    // Anti-duplicado
    const dup = ingresos.find(i => i.fecha === form.fecha && i.monto === monto)
    if (dup) {
      setDuplicado(dup)
      setPendingIngreso(nuevo)
      return
    }

    agregar(nuevo)
  }

  function agregar(ingreso: Ingreso) {
    setIngresos(prev => [ingreso, ...prev])
    setForm({ fecha: HOY, descripcion: '', monto: '', fuente: "K'Drive" })
    setErrors({})
    setShowForm(false)
    setDuplicado(null)
    setPendingIngreso(null)
  }

  function confirmarDuplicado() {
    if (pendingIngreso) agregar(pendingIngreso)
  }

  function cancelarDuplicado() {
    setDuplicado(null)
    setPendingIngreso(null)
  }

  return (
    <div className="ing-page">

      {/* ALERT DUPLICADO */}
      {duplicado && (
        <div className="ing-overlay">
          <div className="ing-dialog">
            <div className="ing-dialog__icon">
              <AlertTriangle size={22} color="var(--gold)" />
            </div>
            <h3 className="ing-dialog__title">Ingreso similar detectado</h3>
            <p className="ing-dialog__body">
              Ya existe un ingreso de <strong>{fmt(duplicado.monto)}</strong> el <strong>{fmtFecha(duplicado.fecha)}</strong> — «{duplicado.descripcion}».
              <br /><br />
              ¿Deseas agregarlo de todas formas?
            </p>
            <div className="ing-dialog__actions">
              <button className="ing-btn ing-btn--ghost" onClick={cancelarDuplicado}>
                <X size={14} /> Cancelar
              </button>
              <button className="ing-btn ing-btn--gold" onClick={confirmarDuplicado}>
                <Check size={14} /> Sí, agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="ing-header">
        <div>
          <h1 className="ing-title">Ingresos</h1>
          <p className="ing-subtitle">Abril 2026</p>
        </div>
        <button className="ing-btn ing-btn--gold" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} />
          Agregar Ingreso
        </button>
      </div>

      {/* RESUMEN CARDS */}
      <div className="ing-summary">
        <div className="ing-stat">
          <div className="ing-stat__icon" style={{ background: 'rgba(29,158,117,0.12)' }}>
            <TrendingUp size={16} color="var(--green)" />
          </div>
          <div>
            <div className="ing-stat__label">Total del mes</div>
            <div className="ing-stat__value" style={{ color: 'var(--green)' }}>{fmt(totalMes)}</div>
          </div>
        </div>
        <div className="ing-stat">
          <div className="ing-stat__icon" style={{ background: 'rgba(212,160,23,0.12)' }}>
            <Calendar size={16} color="var(--gold)" />
          </div>
          <div>
            <div className="ing-stat__label">Total de hoy</div>
            <div className="ing-stat__value" style={{ color: 'var(--gold)' }}>{fmt(totalHoy)}</div>
          </div>
        </div>
        <div className="ing-stat">
          <div className="ing-stat__icon" style={{ background: 'rgba(55,138,221,0.12)' }}>
            <Hash size={16} color="var(--blue)" />
          </div>
          <div>
            <div className="ing-stat__label">Transacciones</div>
            <div className="ing-stat__value" style={{ color: 'var(--blue)' }}>{txMes}</div>
          </div>
        </div>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div className="ing-form-wrap">
          <div className="ing-form-header">
            <span>Nuevo ingreso manual</span>
            <button className="ing-close" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <form className="ing-form" onSubmit={handleSubmit} noValidate>
            <div className="ing-form__row">
              <div className="ing-field">
                <label className="ing-label">Fecha</label>
                <input
                  type="date"
                  className={`ing-input ${errors.fecha ? 'ing-input--error' : ''}`}
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                />
                {errors.fecha && <span className="ing-error">{errors.fecha}</span>}
              </div>
              <div className="ing-field">
                <label className="ing-label">Fuente</label>
                <select
                  className="ing-input ing-select"
                  value={form.fuente}
                  onChange={e => setForm(f => ({ ...f, fuente: e.target.value as Fuente }))}
                >
                  <option>K'Drive</option>
                  <option>Manual</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>
            <div className="ing-field">
              <label className="ing-label">Descripción</label>
              <input
                type="text"
                className={`ing-input ${errors.descripcion ? 'ing-input--error' : ''}`}
                placeholder="Ej. Pago cliente Empresa XYZ"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
              {errors.descripcion && <span className="ing-error">{errors.descripcion}</span>}
            </div>
            <div className="ing-field">
              <label className="ing-label">Monto ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`ing-input ${errors.monto ? 'ing-input--error' : ''}`}
                placeholder="0.00"
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              />
              {errors.monto && <span className="ing-error">{errors.monto}</span>}
            </div>
            <div className="ing-form__actions">
              <button type="button" className="ing-btn ing-btn--ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="ing-btn ing-btn--gold">
                <Plus size={14} /> Agregar Ingreso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA */}
      <div className="ing-table-wrap">
        <table className="ing-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Fuente</th>
              <th className="ing-th--right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(ing => {
              const cfg = FUENTE_CONFIG[ing.fuente]
              return (
                <tr key={ing.id} className="ing-row">
                  <td className="ing-td--fecha">{fmtFecha(ing.fecha)}</td>
                  <td className="ing-td--desc">{ing.descripcion}</td>
                  <td>
                    <span
                      className="ing-badge"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="ing-td--monto">{fmt(ing.monto)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {lista.length === 0 && (
          <div className="ing-empty">Sin ingresos registrados</div>
        )}
      </div>

    </div>
  )
}
