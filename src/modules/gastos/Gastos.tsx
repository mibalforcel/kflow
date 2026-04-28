import { useState, useEffect, useMemo } from 'react'
import { Plus, TrendingDown, Hash, AlertTriangle, X, Check, Loader2, Building2, RefreshCw } from 'lucide-react'
import { fetchGastos, insertGasto, fetchPlaidConnections } from '../../lib/db'
import { useAuth } from '../../contexts/AuthContext'
import type { GastoRow, Categoria } from '../../lib/types'
import './Gastos.css'

const PLAID_CREATE_LINK = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-create-link-token'
const PLAID_EXCHANGE    = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-exchange-token'
const PLAID_GET_TX      = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-get-transactions'

const GIG_KEYWORDS = ['uber', 'lyft', 'amazon', 'doordash', 'instacart']

const CAT_CONFIG: Record<Categoria, { color: string; bg: string }> = {
  Comida:         { color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  Gasolina:       { color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
  Renta:          { color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)' },
  Servicios:      { color: '#06B6D4', bg: 'rgba(6,182,212,0.14)' },
  Transporte:     { color: '#378ADD', bg: 'rgba(55,138,221,0.14)' },
  Entretenimiento:{ color: '#EC4899', bg: 'rgba(236,72,153,0.14)' },
  Otro:           { color: '#9A9A9A', bg: 'rgba(154,154,154,0.14)' },
}

// Mapeo Plaid categories → K'Flow Categoria (más específico primero)
const PLAID_CAT_MAP: Record<string, Categoria> = {
  'Restaurants':              'Comida',
  'Coffee Shop':              'Comida',
  'Fast Food':                'Comida',
  'Food and Drink':           'Comida',
  'Supermarkets and Groceries': 'Comida',
  'Gas Stations':             'Gasolina',
  'Taxi':                     'Transporte',
  'Ride Share':               'Transporte',
  'Airlines':                 'Transporte',
  'Car Service':              'Transporte',
  'Public Transportation':    'Transporte',
  'Transportation':           'Transporte',
  'Travel':                   'Transporte',
  'Gyms and Fitness Centers': 'Entretenimiento',
  'Recreation':               'Entretenimiento',
  'Entertainment':            'Entretenimiento',
  'Arts and Entertainment':   'Entretenimiento',
  'Utilities':                'Servicios',
  'Healthcare':               'Servicios',
  'Service':                  'Servicios',
  'Insurance':                'Servicios',
  'Telecommunication Services': 'Servicios',
  'Rent':                     'Renta',
  'Rental':                   'Renta',
}

function mapPlaidCategory(categories?: string[]): Categoria {
  if (!categories?.length) return 'Otro'
  // Buscar de más específico (final) a más general (inicio)
  for (const cat of [...categories].reverse()) {
    const mapped = PLAID_CAT_MAP[cat]
    if (mapped) return mapped
  }
  return 'Otro'
}

interface PlaidTx {
  transaction_id: string
  name: string
  amount: number       // positivo = gasto, negativo = depósito
  date: string         // YYYY-MM-DD
  category?: string[]
}

const CATEGORIAS = Object.keys(CAT_CONFIG) as Categoria[]

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}

const HOY = new Date().toISOString().slice(0, 10)
const MES  = HOY.slice(0, 7)

function fmtSyncTime(d: Date): string {
  const hoy   = new Date().toISOString().slice(0, 10)
  const fecha = d.toISOString().slice(0, 10)
  const hora  = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (fecha === hoy) return `hoy ${hora}`
  const [, m, dia] = fecha.split('-')
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(dia)} ${MESES[parseInt(m) - 1]} ${hora}`
}

function fechaHace7dias() {
  const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10)
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
  const [plaidConns, setPlaidConns]           = useState<{ institution_name: string | null }[]>([])
  const [plaidConnecting, setPlaidConnecting] = useState(false)
  const [plaidSyncing, setPlaidSyncing]       = useState(false)
  const [plaidSynced, setPlaidSynced]         = useState<number | null>(null)
  const [plaidError, setPlaidError]           = useState<string | null>(null)
  const [syncedAt, setSyncedAt]               = useState<Date | null>(null)
  const [historicoDone, setHistoricoDone]     = useState(false)
  const [toast, setToast]                     = useState<string | null>(null)

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
    // Cargar gastos
    cargar()

    // Cargar Plaid SDK via CDN
    if (!document.getElementById('plaid-link-script')) {
      const script = document.createElement('script')
      script.id    = 'plaid-link-script'
      script.src   = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
      script.async = true
      document.head.appendChild(script)
    }

    // Cargar conexiones Plaid y disparar sync si existen
    fetchPlaidConnections()
      .then(conns => {
        setPlaidConns(conns)
        if (conns.length > 0 && user) syncPlaid(user.id, undefined, true)
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
  async function syncPlaid(userId: string, startDate?: string, silent = false) {
    if (!userId) return
    setPlaidSyncing(true)
    if (!silent) setPlaidError(null)
    try {
      const res = await fetch(PLAID_GET_TX, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...(startDate ? { start_date: startDate } : {}) }),
      })
      const { transactions, error: fnErr } = await res.json() as { transactions?: PlaidTx[]; error?: string }
      if (fnErr) throw new Error(fnErr)
      if (!transactions?.length) { setPlaidSynced(0); setSyncedAt(new Date()); return }

      // Gastos actuales para dedup (cargados en state, pero los leemos frescos)
      const currentGastos = await fetchGastos()

      // Filtrar transacciones a importar
      const toImport = transactions.filter(tx => {
        // Solo gastos (amount > 0)
        if (tx.amount <= 0) return false

        // 4C: excluir explícitamente depósitos gig (créditos de plataformas)
        const nameLower = tx.name.toLowerCase()
        if (tx.amount < 0 && GIG_KEYWORDS.some(k => nameLower.includes(k))) return false

        // Dedup: ±$0.50 en misma fecha
        const isDup = currentGastos.some(
          g => g.fecha === tx.date && Math.abs(g.monto - tx.amount) <= 0.50,
        )
        return !isDup
      })

      // Insertar nuevas transacciones
      let imported = 0
      for (const tx of toImport) {
        try {
          await insertGasto({
            fecha:       tx.date,
            descripcion: tx.name,
            monto:       tx.amount,
            categoria:   mapPlaidCategory(tx.category),
            fuente:      'Plaid',
          })
          imported++
        } catch {
          // Si falla un insert individual, continuar con los demás
        }
      }

      setPlaidSynced(imported)
      setSyncedAt(new Date())
      if (imported > 0) {
        await cargar()
        const label = startDate ? `histórico: ${imported}` : `${imported}`
        setToast(`✓ ${label} gasto${imported !== 1 ? 's' : ''} sincronizado${imported !== 1 ? 's' : ''}`)
      }
      if (startDate) setHistoricoDone(true)
    } catch (e) {
      if (!silent) setPlaidError((e as Error).message)
    } finally {
      setPlaidSyncing(false)
    }
  }

  // ── PLAID CONNECT ──────────────────────────────────────
  async function handleConnectBank() {
    if (!user) return
    setPlaidConnecting(true)
    setPlaidError(null)

    try {
      const linkRes = await fetch(PLAID_CREATE_LINK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bG5ybGlkdG11a3JzaXZpZXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzA4NzksImV4cCI6MjA5MTk0Njg3OX0.4-MX3X4-mCVhxVyzl-tx79zsPS6zh8inR36HDmY9T9Q',
        },
        body: JSON.stringify({ user_id: user.id }),
      })
      const { link_token, error: linkErr } = await linkRes.json()
      if (linkErr) throw new Error(linkErr)

      const PlaidSDK = (window as { Plaid?: { create: (cfg: unknown) => { open: () => void } } }).Plaid
      if (!PlaidSDK) throw new Error('Plaid SDK no disponible. Recarga la página e intenta de nuevo.')

      const handler = PlaidSDK.create({
        token: link_token,
        onSuccess: async (public_token: string, metadata: { institution?: { name?: string } }) => {
          try {
            const exRes = await fetch(PLAID_EXCHANGE, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bG5ybGlkdG11a3JzaXZpZXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzA4NzksImV4cCI6MjA5MTk0Njg3OX0.4-MX3X4-mCVhxVyzl-tx79zsPS6zh8inR36HDmY9T9Q',
              },
              body: JSON.stringify({
                public_token,
                user_id: user.id,
                institution_name: metadata?.institution?.name ?? null,
              }),
            })
            const { success, error: exErr } = await exRes.json()
            if (!success) throw new Error(exErr ?? 'Error al guardar la conexión')

            const instName = metadata?.institution?.name ?? 'Banco'
            setPlaidSynced(null)
            setToast(`✓ ${instName} conectado`)

            // Refrescar lista de conexiones y sync inmediato
            fetchPlaidConnections()
              .then(conns => setPlaidConns(conns))
              .catch(() => {})
            syncPlaid(user.id)
          } catch (e) {
            setPlaidError((e as Error).message)
          } finally {
            setPlaidConnecting(false)
          }
        },
        onExit: () => setPlaidConnecting(false),
      })

      handler.open()
    } catch (e) {
      setPlaidError((e as Error).message)
      setPlaidConnecting(false)
    }
  }

  // ── FORM ──────────────────────────────────────────────
  const lista       = useMemo(() => [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha)), [gastos])
  const listaFiltrada = useMemo(() => {
    if (period === 'Hoy')    return lista.filter(g => g.fecha === HOY)
    if (period === 'Semana') return lista.filter(g => g.fecha >= fechaHace7dias())
    if (period === 'Año')    return lista.filter(g => g.fecha.startsWith(new Date().getFullYear().toString()))
    return lista.filter(g => g.fecha.startsWith(MES)) // Mes: mes en curso
  }, [lista, period])
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
          <p className="gas-subtitle" style={{ textTransform: 'capitalize' }}>{new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="gas-header__actions">
          {plaidConns.length > 0 && (
            <div className="gas-bank-group">
              <div className="gas-bank-row">
                <div className="gas-bank-badge">
                  <Building2 size={13} />
                  {plaidConns.length === 1
                    ? (plaidConns[0].institution_name ?? 'Banco conectado')
                    : plaidConns.length === 2
                      ? plaidConns.map(c => c.institution_name ?? 'Banco').join(' · ')
                      : `${plaidConns.length} bancos`}
                </div>
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
                {!plaidSyncing && !historicoDone && user && (
                  <button
                    className="gas-btn gas-btn--ghost"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', height: 'auto' }}
                    onClick={() => { setHistoricoDone(true); syncPlaid(user.id, '2026-01-01') }}
                    title="Importar todas las transacciones desde el 1 enero 2026"
                  >
                    Importar histórico 2026
                  </button>
                )}
              </div>
              <div className="gas-bank-meta">
                {syncedAt && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Último sync: {fmtSyncTime(syncedAt)}
                  </span>
                )}
                {syncedAt && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.4 }}>·</span>}
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.55, whiteSpace: 'nowrap' }}>
                  Las transacciones pueden tardar 1-3 días en aparecer
                </span>
              </div>
            </div>
          )}
          <button
            className="gas-btn gas-btn--bank"
            onClick={handleConnectBank}
            disabled={plaidConnecting}
          >
            {plaidConnecting
              ? <Loader2 size={14} className="spin" />
              : <Building2 size={14} />}
            {plaidConnecting ? 'Conectando…' : plaidConns.length > 0 ? 'Agregar banco' : 'Conectar banco'}
          </button>
          <button className="gas-btn gas-btn--accent" onClick={() => setShowForm(v => !v)}>
            <Plus size={15} /> Agregar Gasto
          </button>
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
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th className="gas-th--right">Monto</th></tr></thead>
            <tbody>
              {listaFiltrada.map(g => {
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
        )}
        {!loading && listaFiltrada.length === 0 && <div className="gas-empty">Sin gastos registrados</div>}
      </div>
    </div>
  )
}
