import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  fetchGastosFijos,
  insertGastoFijo,
  updateGastoFijo,
  deleteGastoFijo,
} from '../../lib/db'
import type { GastoFijoRow, GastoFijoInsert, CategoriaFijo } from '../../lib/types'
import './Presupuesto.css'

const CATEGORIAS: CategoriaFijo[] = [
  'Hogar', 'Comida', 'Transporte', 'Créditos', 'Entretenimiento', 'Familia', 'Suscripciones',
]

const EMPTY_FORM: GastoFijoInsert = {
  descripcion: '',
  categoria: 'Hogar',
  monto: 0,
  tipo: 'E',
  dia_cobro: null,
  activo: true,
}

const META_KEY = 'kflow_meta_ahorro'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function Presupuesto() {
  const [gastos, setGastos] = useState<GastoFijoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<GastoFijoInsert>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Meta ahorro
  const [metaAhorro, setMetaAhorro] = useState<number>(() => {
    const saved = localStorage.getItem(META_KEY)
    return saved ? Number(saved) : 0
  })
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaInput, setMetaInput] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchGastosFijos()
      setGastos(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(g: GastoFijoRow) {
    setForm({
      descripcion: g.descripcion,
      categoria: g.categoria,
      monto: g.monto,
      tipo: g.tipo,
      dia_cobro: g.dia_cobro,
      activo: g.activo,
    })
    setEditId(g.id)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.descripcion.trim()) return showToast('Descripcion requerida')
    if (form.monto <= 0) return showToast('Monto debe ser mayor a 0')
    setSaving(true)
    try {
      if (editId) {
        const updated = await updateGastoFijo(editId, form)
        setGastos(prev => prev.map(g => g.id === editId ? updated : g))
        showToast('Actualizado')
      } else {
        const created = await insertGastoFijo(form)
        setGastos(prev => [...prev, created])
        showToast('Gasto fijo agregado')
      }
      cancelForm()
    } catch (e) {
      showToast((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGastoFijo(id)
      setGastos(prev => prev.filter(g => g.id !== id))
      showToast('Eliminado')
    } catch (e) {
      showToast((e as Error).message)
    }
  }

  async function handleToggle(g: GastoFijoRow) {
    try {
      const updated = await updateGastoFijo(g.id, { activo: !g.activo })
      setGastos(prev => prev.map(x => x.id === g.id ? updated : x))
    } catch (e) {
      showToast((e as Error).message)
    }
  }

  function saveMeta() {
    const val = parseFloat(metaInput)
    if (!isNaN(val) && val >= 0) {
      setMetaAhorro(val)
      localStorage.setItem(META_KEY, String(val))
    }
    setEditingMeta(false)
  }

  // Derived totals
  const { totalE, totalNE, totalActivo, porCategoria } = useMemo(() => {
    const activos = gastos.filter(g => g.activo)
    const totalE = activos.filter(g => g.tipo === 'E').reduce((s, g) => s + g.monto, 0)
    const totalNE = activos.filter(g => g.tipo === 'NE').reduce((s, g) => s + g.monto, 0)
    const totalActivo = totalE + totalNE
    const porCategoria: Record<string, number> = {}
    for (const g of activos) {
      porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + g.monto
    }
    return { totalE, totalNE, totalActivo, porCategoria }
  }, [gastos])

  // Group by categoria for table display
  const grouped = useMemo(() => {
    const map: Record<string, GastoFijoRow[]> = {}
    for (const g of gastos) {
      if (!map[g.categoria]) map[g.categoria] = []
      map[g.categoria].push(g)
    }
    return map
  }, [gastos])

  return (
    <div className="pres">
      {toast && <div className="pres__toast">{toast}</div>}

      <div className="pres__header">
        <h1 className="pres__title">Presupuesto</h1>
        <button className="pres__btn-add" onClick={openNew}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <div className="pres__form-wrap">
          <div className="pres__form">
            <div className="pres__form-row">
              <label>Descripcion</label>
              <input
                className="pres__input"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Netflix, Renta, Seguro..."
              />
            </div>
            <div className="pres__form-row pres__form-row--3">
              <div>
                <label>Categoria</label>
                <select
                  className="pres__select"
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaFijo }))}
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label>Tipo</label>
                <select
                  className="pres__select"
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'E' | 'NE' }))}
                >
                  <option value="E">Esencial (E)</option>
                  <option value="NE">No Esencial (NE)</option>
                </select>
              </div>
              <div>
                <label>Monto / mes ($)</label>
                <input
                  className="pres__input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto || ''}
                  onChange={e => setForm(f => ({ ...f, monto: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="pres__form-row pres__form-row--2">
              <div>
                <label>Dia de cobro (opcional)</label>
                <input
                  className="pres__input"
                  type="number"
                  min="1"
                  max="31"
                  value={form.dia_cobro ?? ''}
                  onChange={e => setForm(f => ({ ...f, dia_cobro: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="1-31"
                />
              </div>
              <div className="pres__form-activo">
                <label>Activo</label>
                <button
                  className={`pres__toggle ${form.activo ? 'pres__toggle--on' : ''}`}
                  onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                >
                  {form.activo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            </div>
            <div className="pres__form-actions">
              <button className="pres__btn-cancel" onClick={cancelForm} disabled={saving}>
                <X size={14} /> Cancelar
              </button>
              <button className="pres__btn-save" onClick={handleSave} disabled={saving}>
                <Check size={14} /> {editId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE ── */}
      {loading ? (
        <div className="pres__loading">Cargando...</div>
      ) : error ? (
        <div className="pres__error">{error}</div>
      ) : gastos.length === 0 ? (
        <div className="pres__empty">
          Sin gastos fijos registrados. Agrega tu renta, suscripciones, seguros...
        </div>
      ) : (
        <div className="pres__table-wrap">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
            <div key={cat} className="pres__group">
              <div className="pres__group-header">
                <span className="pres__group-name">{cat}</span>
                <span className="pres__group-total">
                  {fmt(items.filter(g => g.activo).reduce((s, g) => s + g.monto, 0))}
                </span>
              </div>
              <table className="pres__table">
                <tbody>
                  {items.map(g => (
                    <tr key={g.id} className={`pres__row ${!g.activo ? 'pres__row--inactive' : ''}`}>
                      <td className="pres__td-desc">
                        <span className="pres__desc">{g.descripcion}</span>
                        {g.dia_cobro && <span className="pres__dia">dia {g.dia_cobro}</span>}
                      </td>
                      <td className="pres__td-tipo">
                        <span className={`pres__badge pres__badge--${g.tipo.toLowerCase()}`}>{g.tipo}</span>
                      </td>
                      <td className="pres__td-monto">{fmt(g.monto)}</td>
                      <td className="pres__td-actions">
                        <button
                          className="pres__icon-btn"
                          title={g.activo ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggle(g)}
                        >
                          {g.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button className="pres__icon-btn" title="Editar" onClick={() => openEdit(g)}>
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="pres__icon-btn pres__icon-btn--danger"
                          title="Eliminar"
                          onClick={() => handleDelete(g.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── META AHORRO ── */}
      <div className="pres__meta-card">
        <div className="pres__meta-header">
          <span className="pres__meta-title">Meta de Ahorro Mensual</span>
          {!editingMeta ? (
            <button className="pres__icon-btn" onClick={() => { setMetaInput(String(metaAhorro)); setEditingMeta(true) }}>
              <Edit2 size={14} />
            </button>
          ) : (
            <div className="pres__meta-edit">
              <input
                className="pres__input pres__input--meta"
                type="number"
                min="0"
                value={metaInput}
                onChange={e => setMetaInput(e.target.value)}
                autoFocus
              />
              <button className="pres__btn-save pres__btn-save--sm" onClick={saveMeta}>
                <Check size={12} />
              </button>
              <button className="pres__btn-cancel pres__btn-cancel--sm" onClick={() => setEditingMeta(false)}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>
        <div className="pres__meta-amount">{fmt(metaAhorro)}</div>
      </div>

      {/* ── RESUMEN ── */}
      <div className="pres__resumen">
        <h2 className="pres__resumen-title">Resumen Presupuesto</h2>
        <div className="pres__resumen-grid">
          <div className="pres__resumen-card pres__resumen-card--e">
            <span className="pres__resumen-label">Gastos Esenciales</span>
            <span className="pres__resumen-value">{fmt(totalE)}</span>
          </div>
          <div className="pres__resumen-card pres__resumen-card--ne">
            <span className="pres__resumen-label">No Esenciales</span>
            <span className="pres__resumen-value">{fmt(totalNE)}</span>
          </div>
          <div className="pres__resumen-card pres__resumen-card--total">
            <span className="pres__resumen-label">Total Comprometido</span>
            <span className="pres__resumen-value">{fmt(totalActivo)}</span>
          </div>
          <div className={`pres__resumen-card pres__resumen-card--meta ${metaAhorro > 0 ? 'pres__resumen-card--meta-set' : ''}`}>
            <span className="pres__resumen-label">Meta de Ahorro</span>
            <span className="pres__resumen-value">{fmt(metaAhorro)}</span>
          </div>
        </div>

        {Object.keys(porCategoria).length > 0 && (
          <div className="pres__breakdown">
            <h3 className="pres__breakdown-title">Por Categoria (activos)</h3>
            <div className="pres__breakdown-list">
              {Object.entries(porCategoria)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, total]) => {
                  const pct = totalActivo > 0 ? Math.round((total / totalActivo) * 100) : 0
                  return (
                    <div key={cat} className="pres__breakdown-row">
                      <span className="pres__breakdown-cat">{cat}</span>
                      <div className="pres__breakdown-bar-wrap">
                        <div className="pres__breakdown-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="pres__breakdown-pct">{pct}%</span>
                      <span className="pres__breakdown-amt">{fmt(total)}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
