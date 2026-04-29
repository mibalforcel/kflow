import { useEffect, useState, useCallback } from 'react'
import { X, LogOut, Building2, Trash2, RefreshCw, Loader2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { signOut } from '../lib/auth'
import { fetchSaldos, fetchInversiones, fetchCreditos, fetchAhorros, fetchPlaidConnectionsFull, deletePlaidConnection } from '../lib/db'
import { syncPlaidTransactions, PLAID_CREATE_LINK, PLAID_EXCHANGE, PLAID_APIKEY } from '../lib/plaidSync'
import type { Currency } from '../lib/types'
import './ProfileModal.css'

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD — Dólar estadounidense' },
  { value: 'COP', label: 'COP — Peso colombiano' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'MXN', label: 'MXN — Peso mexicano' },
  { value: 'BRL', label: 'BRL — Real brasileño' },
]

const BILLING_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

function fmt(amount: number, currency: Currency) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase() || 'KF'
}

interface Summary {
  patrimonioNeto: number
  totalDeudas: number
  totalAhorros: number
}

interface BankConn {
  id: string
  institution_name: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: Props) {
  const { user } = useAuth()
  const { profile, currency, saveProfile } = useProfile()
  const navigate = useNavigate()

  // Form state (initialized from profile)
  const [displayName, setDisplayName] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD')
  const [billingDay, setBillingDay] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Financial summary
  const [summary, setSummary] = useState<Summary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Mis Bancos
  const [banks, setBanks]               = useState<BankConn[]>([])
  const [bankConnecting, setBankConnecting] = useState(false)
  const [bankSyncing, setBankSyncing]   = useState(false)
  const [bankError, setBankError]       = useState<string | null>(null)
  const [bankToast, setBankToast]       = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  // Sync form when profile loads or drawer opens
  useEffect(() => {
    if (profile && isOpen) {
      setDisplayName(profile.display_name)
      setSelectedCurrency(profile.currency)
      setBillingDay(profile.billing_day)
    }
  }, [profile, isOpen])

  // Load financial summary when drawer opens
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const [saldos, inversiones, creditos, ahorros] = await Promise.all([
        fetchSaldos(),
        fetchInversiones(),
        fetchCreditos(),
        fetchAhorros(),
      ])
      const totalSaldos = saldos.reduce((acc, s) => acc + s.saldo, 0)
      const totalInversiones = inversiones.reduce((acc, i) => acc + i.precio_actual * i.cantidad, 0)
      const totalDeudas = creditos.reduce((acc, c) => acc + (c.monto_total - c.monto_pagado), 0)
      const totalAhorros = ahorros.reduce((acc, a) => acc + a.monto_actual, 0)
      setSummary({
        patrimonioNeto: totalSaldos + totalInversiones - totalDeudas,
        totalDeudas,
        totalAhorros,
      })
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) loadSummary()
  }, [isOpen, loadSummary])

  const loadBanks = useCallback(async () => {
    try {
      setBanks(await fetchPlaidConnectionsFull())
    } catch {
      // silencioso
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadBanks()
      // Inyectar Plaid SDK si no está
      if (!document.getElementById('plaid-link-script')) {
        const s = document.createElement('script')
        s.id = 'plaid-link-script'
        s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
        s.async = true
        document.head.appendChild(s)
      }
    }
  }, [isOpen, loadBanks])

  useEffect(() => {
    if (!bankToast) return
    const t = setTimeout(() => setBankToast(null), 3500)
    return () => clearTimeout(t)
  }, [bankToast])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  async function handleConnectBank() {
    if (!user) return
    setBankConnecting(true)
    setBankError(null)
    try {
      const linkRes = await fetch(PLAID_CREATE_LINK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: PLAID_APIKEY },
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
              headers: { 'Content-Type': 'application/json', apikey: PLAID_APIKEY },
              body: JSON.stringify({
                public_token,
                user_id: user.id,
                institution_name: metadata?.institution?.name ?? null,
              }),
            })
            const { success, error: exErr } = await exRes.json()
            if (!success) throw new Error(exErr ?? 'Error al guardar la conexión')

            const instName = metadata?.institution?.name ?? 'Banco'
            await loadBanks()

            // Sincronizar 24 meses de historial
            const startDate = new Date()
            startDate.setMonth(startDate.getMonth() - 24)
            setBankSyncing(true)
            try {
              const result = await syncPlaidTransactions(user.id, startDate.toISOString().slice(0, 10))
              const total = result.gastos + result.ingresos
              setBankToast(`✓ ${instName} conectado · ${total} transacciones importadas`)
            } finally {
              setBankSyncing(false)
            }
          } catch (e) {
            setBankError((e as Error).message)
          } finally {
            setBankConnecting(false)
          }
        },
        onExit: () => setBankConnecting(false),
      })
      handler.open()
    } catch (e) {
      setBankError((e as Error).message)
      setBankConnecting(false)
    }
  }

  async function handleDisconnect(id: string) {
    setDisconnecting(id)
    setBankError(null)
    try {
      await deletePlaidConnection(id)
      setBanks(prev => prev.filter(b => b.id !== id))
    } catch (e) {
      setBankError((e as Error).message)
    } finally {
      setDisconnecting(null)
    }
  }

  async function handleResyncAll() {
    if (!user || banks.length === 0) return
    setBankSyncing(true)
    setBankError(null)
    try {
      const result = await syncPlaidTransactions(user.id)
      const total = result.gastos + result.ingresos
      setBankToast(`✓ ${total} transacción${total !== 1 ? 'es' : ''} sincronizada${total !== 1 ? 's' : ''}`)
    } catch (e) {
      setBankError((e as Error).message)
    } finally {
      setBankSyncing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await saveProfile({
        display_name: displayName.trim() || (user?.email ?? ''),
        currency: selectedCurrency,
        billing_day: billingDay,
      })
      onClose()
    } catch (err: unknown) {
      setSaveError((err as Error).message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined)
  const nameForDisplay = displayName || profile?.display_name || user?.email || ''
  const emailDisplay = user?.email ?? ''

  return (
    <>
      <div
        className={`profile-backdrop${isOpen ? ' profile-backdrop--open' : ''}`}
        onClick={onClose}
      />
      <aside className={`profile-drawer${isOpen ? ' profile-drawer--open' : ''}`}>

        {/* HEADER */}
        <div className="profile-drawer__header">
          <span className="profile-drawer__title">Perfil</span>
          <button className="profile-drawer__close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="profile-drawer__body">

          {/* ── SECCIÓN: MIS DATOS ── */}
          <section>
            <p className="profile-section__label">Mis datos</p>

            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {avatarUrl
                  ? <img src={avatarUrl} alt={nameForDisplay} referrerPolicy="no-referrer" />
                  : getInitials(nameForDisplay)
                }
              </div>
              <div className="profile-avatar__meta">
                <span className="profile-avatar__name">{nameForDisplay}</span>
                <span className="profile-avatar__email">{emailDisplay}</span>
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-label">Nombre</label>
              <input
                className="profile-input"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                maxLength={80}
              />
            </div>

            <div className="profile-field">
              <label className="profile-label">Email</label>
              <input
                className="profile-input"
                type="email"
                value={emailDisplay}
                disabled
                readOnly
              />
            </div>

            <div className="profile-field">
              <label className="profile-label">Moneda</label>
              <select
                className="profile-select"
                value={selectedCurrency}
                onChange={e => setSelectedCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="profile-field">
              <label className="profile-label">Día de corte</label>
              <select
                className="profile-select"
                value={billingDay}
                onChange={e => setBillingDay(Number(e.target.value))}
              >
                {BILLING_DAYS.map(d => (
                  <option key={d} value={d}>Día {d}</option>
                ))}
              </select>
            </div>
          </section>

          <div className="profile-divider" />

          {/* ── SECCIÓN: RESUMEN FINANCIERO ── */}
          <section>
            <p className="profile-section__label">Resumen financiero</p>

            {summaryLoading ? (
              <div className="profile-summary-loading">Calculando…</div>
            ) : summary ? (
              <div className="profile-summary">
                <div className="profile-stat">
                  <span className="profile-stat__label">Patrimonio neto</span>
                  <span className={`profile-stat__value${summary.patrimonioNeto >= 0 ? ' profile-stat__value--green' : ' profile-stat__value--red'}`}>
                    {fmt(summary.patrimonioNeto, currency)}
                  </span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__label">Total deudas</span>
                  <span className="profile-stat__value profile-stat__value--red">
                    {fmt(summary.totalDeudas, currency)}
                  </span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__label">Total ahorros</span>
                  <span className="profile-stat__value profile-stat__value--green">
                    {fmt(summary.totalAhorros, currency)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="profile-summary-loading">No se pudo cargar el resumen</div>
            )}
          </section>

          <div className="profile-divider" />

          {/* ── SECCIÓN: MIS BANCOS ── */}
          <section>
            <div className="profile-banks__header">
              <p className="profile-section__label" style={{ margin: 0 }}>Mis Bancos</p>
              <div className="profile-banks__actions">
                {banks.length > 0 && (
                  <button
                    className="profile-bank-btn profile-bank-btn--ghost"
                    onClick={handleResyncAll}
                    disabled={bankSyncing}
                    title="Re-sincronizar todas las cuentas"
                  >
                    {bankSyncing
                      ? <Loader2 size={13} className="spin" />
                      : <RefreshCw size={13} />}
                    {bankSyncing ? 'Sincronizando…' : 'Re-sincronizar todo'}
                  </button>
                )}
                <button
                  className="profile-bank-btn profile-bank-btn--primary"
                  onClick={handleConnectBank}
                  disabled={bankConnecting || bankSyncing}
                >
                  {bankConnecting
                    ? <Loader2 size={13} className="spin" />
                    : <Plus size={13} />}
                  {bankConnecting ? 'Conectando…' : 'Conectar banco'}
                </button>
              </div>
            </div>

            {bankError && (
              <div className="profile-bank-error">{bankError}</div>
            )}

            {bankToast && (
              <div className="profile-bank-toast">{bankToast}</div>
            )}

            {banks.length === 0 ? (
              <div className="profile-banks__empty">
                <Building2 size={18} style={{ opacity: 0.3 }} />
                <span>Sin cuentas bancarias conectadas</span>
              </div>
            ) : (
              <ul className="profile-banks__list">
                {banks.map(bank => (
                  <li key={bank.id} className="profile-bank-item">
                    <div className="profile-bank-item__icon">
                      <Building2 size={14} />
                    </div>
                    <span className="profile-bank-item__name">
                      {bank.institution_name ?? 'Banco'}
                    </span>
                    <button
                      className="profile-bank-item__remove"
                      onClick={() => handleDisconnect(bank.id)}
                      disabled={disconnecting === bank.id}
                      title="Desconectar"
                    >
                      {disconnecting === bank.id
                        ? <Loader2 size={13} className="spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

        {/* FOOTER */}
        <div className="profile-drawer__footer">
          {saveError && <p className="profile-save-error">{saveError}</p>}
          <button className="profile-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button className="profile-btn-logout" onClick={handleLogout}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>

      </aside>
    </>
  )
}
