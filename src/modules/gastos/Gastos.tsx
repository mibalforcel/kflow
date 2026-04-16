import { useState, useMemo } from 'react'
import { Plus, TrendingDown, Calendar, Hash, AlertTriangle, X, Check } from 'lucide-react'
import './Gastos.css'

type Categoria =
  | 'Comida' | 'Gasolina' | 'Renta' | 'Servicios'
  | 'Transporte' | 'Entretenimiento' | 'Otro'

interface Gasto {
  id: string
  fecha: string
  descripcion: string
  categoria: Categoria
  monto: number
}

const CAT_CONFIG: Record<Categoria, { color: string; bg: string }> = {
  Comida:         { color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  Gasolina:       { color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
  Renta:          { color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)' },
  Servicios:      { color: '#06B6D4', bg: 'rgba(6,182,212,0.14)' },
  Transporte:     { color: '#378ADD', bg: 'rgba(55,138,221,0.14)' },
  Entretenimiento:{ color: '#EC4899', bg: 'rgba(236,72,153,0.14)' },
  Otro:           { color: '#9A9A9A', bg: 'rgba(154,154,154,0.14)' },
}

const CATEGORIAS = Object.keys(CAT_CONFIG) as Categoria[]

const MOCK: Gasto[] = [
  { id: '1', fecha: '2026-04-16', descripcion: 'Almuerzo restaurante',       categoria: 'Comida',          monto: 320 },
  { id: '2', fecha: '2026-04-15', descripcion: 'Gasolina carro',             categoria: 'Gasolina',        monto: 850 },
  { id: '3', fecha: '2026-04-14', descripcion: 'Renta departamento abril',   categoria: 'Renta',           monto: 8500 },
  { id: '4', fecha: '2026-04-12', descripcion: 'Internet + teléfono',        categoria: 'Servicios',       monto: 650 },
  { id: '5', fecha: '2026-04-10', descripcion: 'Uber al aeropuerto',         categoria: 'Transporte',      monto: 280 },
  { id: '6', fecha: '2026-04-08', descripcion: 'Netflix + Spotify',          categoria: 'Entretenimiento', monto: 420 },
  { id: '7', fecha: '2026-04-05', descripcion: 'Farmacia',                   categoria: 'Otro',            monto: 190 },
]

const HOY = new Date().toISOString().slice(0, 10)
const MES  = HOY.slice(0, 7)

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}

export default function Gastos() {
  const [gastos, setGastos]     = useState<Gasto[]>(MOCK)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ fecha: HOY, descripcion: '', monto: '', categoria: 'Comida' as Categoria })
  const [errors, setErrors]     = useState<Partial<typeof form>>({})
  const [duplicado, setDuplicado]         = useState<Gasto | null>(null)
  const [pendingGasto, setPendingGasto]   = useState<Gasto | null>(null)

  const totalMes = useMemo(() => gastos.filter(g => g.fecha.startsWith(MES)).reduce((s, g) => s + g.monto, 0), [gastos])
  const totalHoy = useMemo(() => gastos.filter(g => g.fecha === HOY).reduce((s, g) => s + g.monto, 0), [gastos])
  const txMes    = useMemo(() => gastos.filter(g => g.fecha.startsWith(MES)).length, [gastos])
  const lista    = useMemo(() => [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha)), [gastos])

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
    const nuevo: Gasto = { id: Date.now().toString(), fecha: form.fecha, descripcion: form.descripcion.trim(), categoria: form.categoria, monto }
    const dup = gastos.find(g => g.fecha === form.fecha && g.monto === monto)
    if (dup) { setDuplicado(dup); setPendingGasto(nuevo); return }
    agregar(nuevo)
  }

  function agregar(gasto: Gasto) {
    setGastos(prev => [gasto, ...prev])
    setForm({ fecha: HOY, descripcion: '', monto: '', categoria: 'Comida' })
    setErrors({})
    setShowForm(false)
    setDuplicado(null)
    setPendingGasto(null)
  }

  return (
    <div className="gas-page">

      {duplicado && (
        <div className="gas-overlay">
          <div className="gas-dialog">
            <div className="gas-dialog__icon"><AlertTriangle size={22} color="var(--gold)" /></div>
            <h3 className="gas-dialog__title">Gasto similar detectado</h3>
            <p className="gas-dialog__body">
              Ya existe un gasto de <strong>{fmt(duplicado.monto)}</strong> el <strong>{fmtFecha(duplicado.fecha)}</strong> — «{duplicado.descripcion}».
              <br /><br />¿Deseas agregarlo de todas formas?
            </p>
            <div className="gas-dialog__actions">
              <button className="gas-btn gas-btn--ghost" onClick={() => { setDuplicado(null); setPendingGasto(null) }}><X size={14} /> Cancelar</button>
              <button className="gas-btn gas-btn--accent" onClick={() => pendingGasto && agregar(pendingGasto)}><Check size={14} /> Sí, agregar</button>
            </div>
          </div>
        </div>
      )}

      <div className="gas-header">
        <div>
          <h1 className="gas-title">Gastos</h1>
          <p className="gas-subtitle">Abril 2026</p>
        </div>
        <button className="gas-btn gas-btn--accent" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} /> Agregar Gasto
        </button>
      </div>

      <div className="gas-summary">
        <div className="gas-stat">
          <div className="gas-stat__icon" style={{ background: 'rgba(226,75,74,0.12)' }}><TrendingDown size={16} color="var(--red)" /></div>
          <div><div className="gas-stat__label">Total del mes</div><div className="gas-stat__value" style={{ color: 'var(--red)' }}>{fmt(totalMes)}</div></div>
        </div>
        <div className="gas-stat">
          <div className="gas-stat__icon" style={{ background: 'rgba(212,160,23,0.12)' }}><Calendar size={16} color="var(--gold)" /></div>
          <div><div className="gas-stat__label">Total de hoy</div><div className="gas-stat__value" style={{ color: 'var(--gold)' }}>{fmt(totalHoy)}</div></div>
        </div>
        <div className="gas-stat">
          <div className="gas-stat__icon" style={{ background: 'rgba(55,138,221,0.12)' }}><Hash size={16} color="var(--blue)" /></div>
          <div><div className="gas-stat__label">Transacciones</div><div className="gas-stat__value" style={{ color: 'var(--blue)' }}>{txMes}</div></div>
        </div>
      </div>

      {showForm && (
        <div className="gas-form-wrap">
          <div className="gas-form-header">
            <span>Nuevo gasto manual</span>
            <button className="gas-close" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form className="gas-form" onSubmit={handleSubmit} noValidate>
            <div className="gas-form__row">
              <div className="gas-field">
                <label className="gas-label">Fecha</label>
                <input type="date" className={`gas-input ${errors.fecha ? 'gas-input--error' : ''}`} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                {errors.fecha && <span className="gas-error">{errors.fecha}</span>}
              </div>
              <div className="gas-field">
                <label className="gas-label">Categoría</label>
                <select className="gas-input gas-select" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as Categoria }))}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="gas-field">
              <label className="gas-label">Descripción</label>
              <input type="text" className={`gas-input ${errors.descripcion ? 'gas-input--error' : ''}`} placeholder="Ej. Almuerzo restaurante" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              {errors.descripcion && <span className="gas-error">{errors.descripcion}</span>}
            </div>
            <div className="gas-field">
              <label className="gas-label">Monto ($)</label>
              <input type="number" min="0" step="0.01" className={`gas-input ${errors.monto ? 'gas-input--error' : ''}`} placeholder="0.00" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
              {errors.monto && <span className="gas-error">{errors.monto}</span>}
            </div>
            <div className="gas-form__actions">
              <button type="button" className="gas-btn gas-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="gas-btn gas-btn--accent"><Plus size={14} /> Agregar Gasto</button>
            </div>
          </form>
        </div>
      )}

      <div className="gas-table-wrap">
        <table className="gas-table">
          <thead>
            <tr>
              <th>Fecha</th><th>Descripción</th><th>Categoría</th><th className="gas-th--right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(g => {
              const cfg = CAT_CONFIG[g.categoria]
              return (
                <tr key={g.id} className="gas-row">
                  <td className="gas-td--fecha">{fmtFecha(g.fecha)}</td>
                  <td className="gas-td--desc">{g.descripcion}</td>
                  <td><span className="gas-badge" style={{ color: cfg.color, background: cfg.bg }}>{g.categoria}</span></td>
                  <td className="gas-td--monto">{fmt(g.monto)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {lista.length === 0 && <div className="gas-empty">Sin gastos registrados</div>}
      </div>
    </div>
  )
}
