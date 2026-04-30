import { useState, useEffect, useMemo } from 'react'
import { Plus, TrendingDown, Hash, AlertTriangle, X, Check, Loader2, Building2, RefreshCw, Search } from 'lucide-react'
import { fetchGastos, insertGasto, fetchPlaidConnections } from '../../lib/db'
import { syncPlaidTransactions } from '../../lib/plaidSync'
import { todayET, sevenDaysAgoET, thisYearET, dateToET } from '../../lib/dateET'
import { useAuth } from '../../contexts/AuthContext'
import type { GastoRow, Categoria } from '../../lib/types'
import './Gastos.css'

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

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}

const HOY = todayET()
const MES  = HOY.slice(0, 7)

function cuentaLabel(fuente: string | undefined, conns: { institution_name: string | null }[]): string {
  if (!fuente || fuente === 'Manual') return 'Manual'
  if (fuente === "K'Drive") return "K'Drive"
  if (fuente === 'Plaid') {
    if (conns.length === 1) return conns[0].institution_name ?? 'Plaid'
    return 'Plaid'
  }
  return fuente
}

function fmtSyncTime(d: Date): string {
  const hoy   = todayET()
  const fecha = dateToET(d)
  const hora  = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (fecha === hoy) return `hoy ${hora}`
  const [, m, dia] = fecha.split('-')
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(dia)} ${MESES[parseInt(m) - 1]} ${hora}`
}

function fechaHace7dias() {
  return sevenDaysAgoET()
}

export default function Gastos({ period = 'Mes' }: { period?: 'Hoy' | 'Semana' | 'Mes' | 'Año' }) {
  const { user } = useAuth()

  const [gastos, setGastos]   = useState<GastoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ fecha: HOY, descripcion: '', monto: '', categoria: 'Comida' as Categoria })
  const [errors, setErrors]     = useState<Partial<typeof form>>({})
  const [duplicado, setDuplicado]       = useState<GastoRow | null>(null)
  const [pendingInsert, setPendingInsert] = useState<typeof form | null>(null)

  // Plaid
  const [query, setQuery] = useState('')

  const [plaidConns, setPlaidConns]     = useState<{ institution_name: string | null }[]>([])
  const [plaidSyncing, setPlaidSyncing] = useState(false)
  const [plaidSynced, setPlaidSynced]   = useState<number | null>(null)
  const [plaidError, setPlaidError]     = useState<string | null>(null)
  const [syncedAt, setSyncedAt]         = useState<Date | null>(null)
  const [toast, setToast]               = useState<string | null>(null)

  async function cargar() {
    try {
      setLoading(true); setError(null)
      setGastos(await fetchGastos())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    fetchPlaidConnections()
      .then(conns => {
        setPlaidConns(conns)
        if (conns.length > 0 && user) syncPlaid(user.id, true)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── PLAID SYNC ─────────────────────────────────────────
  async function syncPlaid(userId: string, silent = false) {
    if (!userId) return
    setPlaidSyncing(true)
    if (!silent) setPlaidError(null)
    try {
      const result = await syncPlaidTransactions(userId)
      setPlaidSynced(result.gastos)
      setSyncedAt(new Date())
      if (result.gastos > 0) {
        await cargar()
        setToast(`✓ ${result.gastos} gasto${result.gastos !== 1 ? 's' : ''} sincronizado${result.gastos !== 1 ? 's' : ''}`)
      }
    } catch (e) {
      if (!silent) setPlaidError((e as Error).message)
    } finally {
      setPlaidSyncing(false)
    }
  }

  // ── FORM ──────────────────────────────────────────────
  const lista       = useMemo(() => [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha)), [gastos])
  const listaFiltrada = useMemo(() => {
    // 1️⃣ Filtro por período
    let result = lista
    if (period === 'Hoy')         result = result.filter(g => g.fecha === HOY)
    else if (period === 'Semana') result = result.filter(g => g.fecha >= fechaHace7dias())
    else if (period === 'Año')    result = result.filter(g => g.fecha.startsWith(thisYearET()))
    else                          result = result.filter(g => g.fecha.startsWith(MES))
    // 2️⃣ Filtro por query (sobre el resultado del período)
    const q = query.trim().toLowerCase()
    if (q) result = result.filter(g =>
      g.descripcion.toLowerCase().includes(q) ||
      g.categoria.toLowerCase().includes(q) ||
      g.monto.toString().includes(q)
    )
    return result
  }, [lista, period, query])
  const totalPeriod = useMemo(() => listaFiltrada.reduce((s, g) => s + g.monto, 0), [listaFiltrada])
  const txPeriod    = useMemo(() => listaFiltrada.length, [listaFiltrada])
  const periodLabel = period === 'Hoy' ? 'de hoy' : period === 'Semana' ? 'semana' : period === 'Año' ? 'del año' : 'del mes'

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
    const dup = gastos.find(g => g.fecha === form.fecha && g.monto === monto)
    if (dup) { setDuplicado(dup); setPendingInsert({ ...form }); return }
    agregar(form)
  }

  async function agregar(f: typeof form) {
    try {
      setSaving(true)
      await insertGasto({ fecha: f.fecha, descripcion: f.descripcion.trim(), categoria: f.categoria, monto: Number(f.monto) })
      await cargar()
      setForm({ fecha: HOY, descripcion: '', monto: '', categoria: 'Comida' })
      setErrors({}); setShowForm(false); setDuplicado(null); setPendingInsert(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gas-page">

      {toast && <div className="gas-toast">{toast}</div>}

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
              <button className="gas-btn gas-btn--ghost" onClick={() => { setDuplicado(null); setPendingInsert(null) }}><X size={14} /> Cancelar</button>
              <button className="gas-btn gas-btn--accent" disabled={saving} onClick={() => pendingInsert && agregar(pendingInsert)}><Check size={14} /> Sí, agregar</button>
            </div>
          </div>
        </div>
      )}

      <div className="gas-header">
        <div>
          <h1 className="gas-title">Gastos</h1>
          <p className="gas-subtitle" style={{ textTransform: 'capitalize' }}>{new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric', timeZone: 'America/New_York' })}</p>
        </div>
        <div className="gas-header__actions">
          <div className="gas-header-line1">
            {plaidConns.length > 0 && (
              <div className="gas-bank-badge">
                <Building2 size={13} />
                {plaidConns.length === 1
                  ? (plaidConns[0].institution_name ?? 'Banco conectado')
                  : plaidConns.length === 2
                    ? plaidConns.map(c => c.institution_name ?? 'Banco').join(' · ')
                    : `${plaidConns.length} bancos`}
              </div>
            )}
            <button className="gas-btn gas-btn--accent" onClick={() => setShowForm(v => !v)}>
              <Plus size={15} /> Agregar Gasto
            </button>
          </div>
          {plaidConns.length > 0 && (
            <div className="gas-bank-status">
              {plaidSyncing ? (
                <span className="gas-sync-badge gas-sync-badge--loading">
                  <Loader2 size={11} className="spin" /> Sincronizando…
                </span>
              ) : plaidSynced !== null && plaidSynced > 0 ? (
                <span className="gas-sync-badge gas-sync-badge--new">+{plaidSynced} nuevos</span>
              ) : plaidSynced === 0 ? (
                <span className="gas-sync-badge gas-sync-badge--ok">✓ al día</span>
              ) : null}
              {!plaidSyncing && user && (
                <button
                  className="gas-sync-btn"
                  onClick={() => { setPlaidSynced(null); syncPlaid(user.id) }}
                  title="Sincronizar ahora"
                >
                  <RefreshCw size={12} />
                </button>
              )}
              {syncedAt && (
                <span className="gas-status-text">Último sync: {fmtSyncTime(syncedAt)}</span>
              )}
              {syncedAt && <span className="gas-status-sep">·</span>}
              <span className="gas-status-text">Las transacciones pueden tardar 1-3 días en aparecer</span>
            </div>
          )}
        </div>
      </div>

      <div className="gas-summary">
        <div className="gas-stat">
          <div className="gas-stat__icon" style={{ background: 'rgba(226,75,74,0.12)' }}><TrendingDown size={16} color="var(--red)" /></div>
          <div><div className="gas-stat__label">Total {periodLabel}</div><div className="gas-stat__value" style={{ color: 'var(--red)' }}>{loading ? '—' : fmt(totalPeriod)}</div></div>
        </div>
<div className="gas-stat">
          <div className="gas-stat__icon" style={{ background: 'rgba(55,138,221,0.12)' }}><Hash size={16} color="var(--blue)" /></div>
          <div><div className="gas-stat__label">Transacciones</div><div className="gas-stat__value" style={{ color: 'var(--blue)' }}>{loading ? '—' : txPeriod}</div></div>
        </div>
      </div>

      {error      && <div className="gas-error-banner">⚠ {error}</div>}
      {plaidError && <div className="gas-error-banner">⚠ {plaidError}</div>}

      <div className="gas-search-wrap">
        <Search size={15} className="gas-search-icon" />
        <input
          type="text"
          className="gas-search-input"
          placeholder="Buscar por descripción, categoría o monto…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button className="gas-search-clear" onClick={() => setQuery('')}>
            <X size={13} />
          </button>
        )}
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
              <button type="submit" className="gas-btn gas-btn--accent" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Agregar Gasto
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="gas-table-wrap">
        {loading ? (
          <div className="gas-empty"><Loader2 size={20} className="spin" style={{ marginBottom: 8 }} /><br />Cargando...</div>
        ) : (
          <table className="gas-table">
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th className="gas-th--cuenta">Cuenta</th><th className="gas-th--right">Monto</th></tr></thead>
            <tbody>
              {listaFiltrada.map(g => {
                const cfg = CAT_CONFIG[g.categoria]
                const cuenta = cuentaLabel(g.fuente, plaidConns)
                return (
                  <tr key={g.id} className="gas-row">
                    <td className="gas-td--fecha">{fmtFecha(g.fecha)}</td>
                    <td className="gas-td--desc">{g.descripcion}</td>
                    <td><span className="gas-badge" style={{ color: cfg.color, background: cfg.bg }}>{g.categoria}</span></td>
                    <td className="gas-td--cuenta">{cuenta}</td>
                    <td className="gas-td--monto">{fmt(g.monto)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && listaFiltrada.length === 0 && <div className="gas-empty">{query ? 'Sin resultados para esa búsqueda' : 'Sin gastos registrados'}</div>}
      </div>
    </div>
  )
}
