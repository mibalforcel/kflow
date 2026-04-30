import { useState, useEffect, useMemo } from 'react'
import { Wallet, Loader2, Building2, RefreshCw } from 'lucide-react'
import { fetchSaldos, fetchPlaidConnections } from '../../lib/db'
import { useAuth } from '../../contexts/AuthContext'
import type { SaldoRow, TipoCuenta } from '../../lib/types'
import { todayET, dateToET } from '../../lib/dateET'
import './Saldos.css'

const PLAID_GET_ACCOUNTS = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-get-accounts'

const TIPO_CONFIG: Record<TipoCuenta, { color: string; bg: string }> = {
  'Débito':  { color: 'var(--blue)',  bg: 'rgba(55,138,221,0.15)' },
  'Crédito': { color: 'var(--red)',   bg: 'rgba(226,75,74,0.15)' },
  'Ahorro':  { color: 'var(--green)', bg: 'rgba(29,158,117,0.15)' },
  'Cash':    { color: 'var(--gold)',  bg: 'rgba(212,160,23,0.15)' },
}

interface PlaidAccount {
  account_id: string
  name: string
  type: string
  subtype: string | null
  balances: { current: number | null; available: number | null }
  institution_name: string | null
}

function mapPlaidTipo(type: string, subtype: string | null): TipoCuenta {
  if (type === 'credit') return 'Crédito'
  if (type === 'depository') {
    if (subtype === 'savings') return 'Ahorro'
    return 'Débito'
  }
  return 'Débito'
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

function fmt(n: number) {
  const abs = Math.abs(n)
  const str = '$' + abs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-${str}` : str
}

export default function Saldos() {
  const { user } = useAuth()

  const [cuentas, setCuentas]         = useState<SaldoRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [plaidConns, setPlaidConns]   = useState<{ institution_name: string | null }[]>([])
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([])
  const [plaidLoading, setPlaidLoading]   = useState(false)
  const [plaidError, setPlaidError]       = useState<string | null>(null)
  const [syncedAt, setSyncedAt]           = useState<Date | null>(null)

  async function cargar() {
    try {
      setLoading(true); setError(null)
      const [rows, conns] = await Promise.all([fetchSaldos(), fetchPlaidConnections()])
      setCuentas(rows)
      setPlaidConns(conns)
      if (conns.length > 0 && user) {
        fetchPlaidAccounts(user.id)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlaidAccounts(userId: string) {
    try {
      setPlaidLoading(true); setPlaidError(null)
      const res = await fetch(PLAID_GET_ACCOUNTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPlaidError(data.error ?? 'Error al obtener cuentas del banco')
        return
      }
      setPlaidAccounts(data.accounts ?? [])
      setSyncedAt(new Date())
    } catch (e) {
      setPlaidError((e as Error).message)
    } finally {
      setPlaidLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const totalManual = useMemo(() => cuentas.reduce((s, c) => s + c.saldo, 0), [cuentas])
  const totalPlaid  = useMemo(
    () => plaidAccounts.reduce((s, a) => s + (a.balances.current ?? 0), 0),
    [plaidAccounts],
  )
  const total = totalManual + totalPlaid

  // Agrupar cuentas Plaid por institución
  const accountsByInstitution = useMemo(() => {
    const map = new Map<string, PlaidAccount[]>()
    for (const a of plaidAccounts) {
      const key = a.institution_name ?? 'Banco'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [plaidAccounts])

  return (
    <div className="sal-page">

      <div className="sal-header">
        <div>
          <h1 className="sal-title">Saldos</h1>
          <p className="sal-subtitle">Cuentas consolidadas</p>
        </div>
        <div className="sal-header__actions">
          {plaidConns.length > 0 && (
            <span className="sal-bank-badge">
              <Building2 size={13} />
              {plaidConns.length === 1
                ? (plaidConns[0].institution_name ?? 'Banco conectado')
                : `${plaidConns.length} bancos`}
            </span>
          )}
        </div>
      </div>

      <div className="sal-total-card">
        <div className="sal-total-card__left">
          <div className="sal-total-card__icon"><Wallet size={20} color="var(--gold)" /></div>
          <div>
            <div className="sal-total-card__label">Saldo total consolidado</div>
            <div className="sal-total-card__value" style={{ color: total >= 0 ? 'var(--gold)' : 'var(--red)' }}>
              {loading ? '—' : fmt(total)}
            </div>
          </div>
        </div>
        <div className="sal-total-card__right">
          <div className="sal-total-stat"><span className="sal-total-stat__label">Cuentas</span><span className="sal-total-stat__val">{cuentas.length + plaidAccounts.length}</span></div>
          <div className="sal-total-stat"><span className="sal-total-stat__label">Manual</span><span className="sal-total-stat__val">{cuentas.length}</span></div>
          {plaidConns.length > 0 && <div className="sal-total-stat"><span className="sal-total-stat__label">Banco</span><span className="sal-total-stat__val" style={{ color: 'var(--green)' }}>{plaidAccounts.length}</span></div>}
        </div>
      </div>

      {error && <div className="sal-error-banner">⚠ {error}</div>}

      {loading ? (
        <div className="sal-loading"><Loader2 size={20} className="spin" /> Cargando...</div>
      ) : (
        <>
          {/* SECCIONES PLAID — una por institución */}
          {plaidConns.length > 0 && (
            <>
              {plaidError && <div className="sal-error-banner">⚠ {plaidError}</div>}
              {plaidLoading && plaidAccounts.length === 0 ? (
                <div className="sal-loading"><Loader2 size={16} className="spin" /> Obteniendo saldos del banco...</div>
              ) : (
                <>
                  {[...accountsByInstitution.entries()].map(([instName, accounts]) => (
                    <div key={instName} className="sal-section">
                      <div className="sal-section-header">
                        <span className="sal-section-label">
                          <Building2 size={13} />
                          {instName}
                        </span>
                        <button
                          className="sal-refresh-btn"
                          onClick={() => user && fetchPlaidAccounts(user.id)}
                          disabled={plaidLoading}
                          title="Actualizar saldos"
                        >
                          <RefreshCw size={13} className={plaidLoading ? 'spin' : ''} />
                        </button>
                      </div>
                      <div className="sal-grid">
                        {accounts.map(a => {
                          const tipo  = mapPlaidTipo(a.type, a.subtype)
                          const cfg   = TIPO_CONFIG[tipo]
                          const saldo = a.balances.current ?? 0
                          return (
                            <div key={a.account_id} className="sal-card sal-card--plaid">
                              <div className="sal-card__top">
                                <span className="sal-card__nombre">{a.name}</span>
                                <span className="sal-badge" style={{ color: cfg.color, background: cfg.bg }}>{tipo}</span>
                              </div>
                              <div className="sal-card__saldo" style={{ color: saldo < 0 ? 'var(--red)' : 'var(--gold)' }}>
                                {fmt(saldo)}
                              </div>
                              <span className="sal-plaid-badge">Plaid</span>
                              {syncedAt && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                                  Último sync: {fmtSyncTime(syncedAt)}
                                </span>
                              )}
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.55, marginTop: 2, display: 'block' }}>
                                Las transacciones pueden tardar 1-3 días en aparecer
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {plaidAccounts.length === 0 && (
                    <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Sin cuentas disponibles
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* SECCIÓN MANUAL */}
          {(cuentas.length > 0 || plaidConns.length === 0) && (
            <div className="sal-section">
              {plaidConns.length > 0 && <div className="sal-section-header"><span className="sal-section-label">Cuentas manuales</span></div>}
              <div className="sal-grid">
                {cuentas.map(c => {
                  const cfg = TIPO_CONFIG[c.tipo as TipoCuenta] ?? TIPO_CONFIG['Débito']
                  return (
                    <div key={c.id} className="sal-card">
                      <div className="sal-card__top">
                        <span className="sal-card__nombre">{c.nombre}</span>
                        <span className="sal-badge" style={{ color: cfg.color, background: cfg.bg }}>{c.tipo}</span>
                      </div>
                      <div className="sal-card__saldo" style={{ color: c.saldo < 0 ? 'var(--red)' : 'var(--gold)' }}>
                        {fmt(c.saldo)}
                      </div>
                    </div>
                  )
                })}
                {cuentas.length === 0 && (
                  <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Sin cuentas manuales
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
