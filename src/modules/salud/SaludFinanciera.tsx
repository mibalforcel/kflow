import { useState, useEffect, useMemo } from 'react'
import {
  Activity, TrendingUp, TrendingDown, CreditCard, Target, Zap,
  Shield, Loader2, RefreshCw, AlertCircle,
} from 'lucide-react'
import {
  fetchIngresos, fetchGastos, fetchCreditos,
  fetchAhorros, fetchInversiones, fetchSaldos, fetchGastosFijos,
} from '../../lib/db'
import { useAuth } from '../../contexts/AuthContext'
import type {
  IngresoRow, GastoRow, CreditoRow, AhorroRow, InversionRow, SaldoRow, Categoria, GastoFijoRow,
} from '../../lib/types'
import { todayET, sevenDaysAgoET, thisYearET } from '../../lib/dateET'
import './SaludFinanciera.css'

// ── Constantes ────────────────────────────────────────────────────────────────

const CLAUDE_URL = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/claude-recomendaciones'

type GrupoSalud = 'Hogar' | 'Comida' | 'Transporte' | 'Entretenimiento' | 'Familia'
type TipoGasto  = 'E' | 'NE'

const CAT_SALUD: Record<Categoria, { grupo: GrupoSalud; tipo: TipoGasto; color: string }> = {
  Renta:           { grupo: 'Hogar',           tipo: 'E',  color: '#8B5CF6' },
  Servicios:       { grupo: 'Hogar',           tipo: 'E',  color: '#8B5CF6' },
  Comida:          { grupo: 'Comida',          tipo: 'E',  color: '#F59E0B' },
  Gasolina:        { grupo: 'Transporte',      tipo: 'E',  color: '#378ADD' },
  Transporte:      { grupo: 'Transporte',      tipo: 'NE', color: '#378ADD' },
  Entretenimiento: { grupo: 'Entretenimiento', tipo: 'NE', color: '#EC4899' },
  Otro:            { grupo: 'Familia',         tipo: 'E',  color: '#1D9E75' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function dateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface GastoFijo {
  descripcion: string
  categoria: Categoria
  monto_promedio: number
  meses_detectados: number
}

interface DeudaAvalanche {
  id: string
  nombre: string
  pendiente: number
  tasa_interes: number
  pago_estimado: number
  meses_estimados: number
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SaludFinanciera({ period = 'Mes' }: { period?: 'Hoy' | 'Semana' | 'Mes' | 'Año' }) {
  const { user } = useAuth()

  const [ingresos,    setIngresos]    = useState<IngresoRow[]>([])
  const [gastos,      setGastos]      = useState<GastoRow[]>([])
  const [creditos,    setCreditos]    = useState<CreditoRow[]>([])
  const [ahorros,     setAhorros]     = useState<AhorroRow[]>([])
  const [inversiones,    setInversiones]    = useState<InversionRow[]>([])
  const [saldos,         setSaldos]         = useState<SaldoRow[]>([])
  const [gastosFijosDB,  setGastosFijosDB]  = useState<GastoFijoRow[]>([])
  const [loading,        setLoading]        = useState(true)

  const [recs,        setRecs]        = useState<string[]>([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsError,   setRecsError]   = useState<string | null>(null)
  const [tasaRetorno, setTasaRetorno] = useState(4)

  useEffect(() => {
    Promise.all([
      fetchIngresos(), fetchGastos(), fetchCreditos(),
      fetchAhorros(), fetchInversiones(), fetchSaldos(), fetchGastosFijos(),
    ]).then(([ing, gas, cre, aho, inv, sal, gf]) => {
      setIngresos(ing); setGastos(gas); setCreditos(cre)
      setAhorros(aho); setInversiones(inv); setSaldos(sal)
      setGastosFijosDB(gf)
    }).finally(() => setLoading(false))
  }, [])

  // ── Fechas base ─────────────────────────────────────────────────────────────

  const HOY = todayET()
  const MES  = HOY.slice(0, 7)

  // ── Datos filtrados por period ───────────────────────────────────────────────

  const ingresosPeriod = useMemo(() => {
    if (period === 'Hoy')    return ingresos.filter(i => i.fecha === HOY)
    if (period === 'Semana') return ingresos.filter(i => i.fecha >= sevenDaysAgoET())
    if (period === 'Año')    return ingresos.filter(i => i.fecha.startsWith(thisYearET()))
    return ingresos.filter(i => i.fecha.startsWith(MES))
  }, [ingresos, period, HOY, MES])

  const gastosPeriod = useMemo(() => {
    if (period === 'Hoy')    return gastos.filter(g => g.fecha === HOY)
    if (period === 'Semana') return gastos.filter(g => g.fecha >= sevenDaysAgoET())
    if (period === 'Año')    return gastos.filter(g => g.fecha.startsWith(thisYearET()))
    return gastos.filter(g => g.fecha.startsWith(MES))
  }, [gastos, period, HOY, MES])

  // ── Datos del mes actual (para Score) ───────────────────────────────────────

  const ingresosMes = useMemo(() => ingresos.filter(i => i.fecha.startsWith(MES)), [ingresos, MES])
  const gastosMes   = useMemo(() => gastos.filter(g => g.fecha.startsWith(MES)), [gastos, MES])

  // ── Totales del period ───────────────────────────────────────────────────────

  const totalIngresos = useMemo(() => ingresosPeriod.reduce((s, i) => s + i.monto, 0), [ingresosPeriod])
  const gastosE_period = useMemo(
    () => gastosPeriod.filter(g => CAT_SALUD[g.categoria]?.tipo === 'E').reduce((s, g) => s + g.monto, 0),
    [gastosPeriod],
  )
  const gastosNE_period = useMemo(
    () => gastosPeriod.filter(g => CAT_SALUD[g.categoria]?.tipo === 'NE').reduce((s, g) => s + g.monto, 0),
    [gastosPeriod],
  )

  // ── Totales del mes (para Score) ─────────────────────────────────────────────

  const totalIngresosMes = useMemo(() => ingresosMes.reduce((s, i) => s + i.monto, 0), [ingresosMes])
  const gastosE_mes = useMemo(
    () => gastosMes.filter(g => CAT_SALUD[g.categoria]?.tipo === 'E').reduce((s, g) => s + g.monto, 0),
    [gastosMes],
  )
  const gastosNE_mes = useMemo(
    () => gastosMes.filter(g => CAT_SALUD[g.categoria]?.tipo === 'NE').reduce((s, g) => s + g.monto, 0),
    [gastosMes],
  )
  const totalGastosMes = gastosE_mes + gastosNE_mes

  // ── Servicio mensual estimado de deudas ──────────────────────────────────────

  const deudaMensual = useMemo(() => creditos.reduce((s, c) => {
    const pend = c.monto_total - c.monto_pagado
    return pend > 0 ? s + Math.max(pend * 0.03, 25) : s
  }, 0), [creditos])

  // ── Score ────────────────────────────────────────────────────────────────────

  const ratioEsencial = totalIngresosMes > 0 ? gastosE_mes / totalIngresosMes : 1
  const ratioDeudas   = totalIngresosMes > 0 ? deudaMensual / totalIngresosMes : 1
  const ratioAhorro   = totalIngresosMes > 0
    ? Math.max(0, totalIngresosMes - gastosE_mes - gastosNE_mes - deudaMensual) / totalIngresosMes
    : 0

  const score = useMemo(() => {
    let s = 100
    if (ratioEsencial > 0.70) s -= 35
    else if (ratioEsencial > 0.50) s -= 15
    if (ratioDeudas > 0.50) s -= 30
    else if (ratioDeudas > 0.30) s -= 15
    if (ratioAhorro < 0.05) s -= 25
    else if (ratioAhorro < 0.20) s -= 10
    return Math.max(0, Math.min(100, s))
  }, [ratioEsencial, ratioDeudas, ratioAhorro])

  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--gold)' : 'var(--red)'
  const scoreLabel = score >= 70 ? 'Saludable' : score >= 40 ? 'Atención' : 'Crítico'

  // ── Flujo de caja (period) ────────────────────────────────────────────────────

  const flujoLibre     = totalIngresos - gastosE_period - deudaMensual
  const flujoConAhorro = flujoLibre - totalIngresos * 0.20

  // ── Categorías por grupo ──────────────────────────────────────────────────────

  const categorias = useMemo(() => {
    const grupos: Record<GrupoSalud, { monto: number; tipo: TipoGasto; color: string }> = {
      Hogar:           { monto: 0, tipo: 'E',  color: '#8B5CF6' },
      Comida:          { monto: 0, tipo: 'E',  color: '#F59E0B' },
      Transporte:      { monto: 0, tipo: 'E',  color: '#378ADD' },
      Entretenimiento: { monto: 0, tipo: 'NE', color: '#EC4899' },
      Familia:         { monto: 0, tipo: 'E',  color: '#1D9E75' },
    }
    gastosPeriod.forEach(g => {
      const cfg = CAT_SALUD[g.categoria]
      if (cfg) grupos[cfg.grupo].monto += g.monto
    })
    const total = Object.values(grupos).reduce((s, v) => s + v.monto, 0)
    return Object.entries(grupos).map(([nombre, v]) => ({
      nombre: nombre as GrupoSalud,
      ...v,
      porcentaje: pct(v.monto, total || 1),
    })).sort((a, b) => b.monto - a.monto)
  }, [gastosPeriod])

  // ── Ingreso gig: últimas 4 semanas ───────────────────────────────────────────

  const gigSemanas = useMemo(() => {
    const semanas = [0, 1, 2, 3].map(w => {
      const desde = dateNDaysAgo(w * 7 + 6)
      const hasta = dateNDaysAgo(w * 7)
      const total = ingresos
        .filter(i => i.fuente === "K'Drive" && i.fecha >= desde && i.fecha <= hasta)
        .reduce((s, i) => s + i.monto, 0)
      return { semana: w + 1, total }
    })
    const totales  = semanas.map(s => s.total)
    const promedio = totales.reduce((s, v) => s + v, 0) / 4
    const minimo   = Math.min(...totales)
    const maximo   = Math.max(...totales)
    return { semanas, promedio, minimo, maximo }
  }, [ingresos])

  // ── Gastos fijos: DB primero, auto-deteccion como fallback ───────────────────

  const gastosFijos = useMemo((): GastoFijo[] => {
    // Si el usuario ya tiene gastos fijos en DB, usarlos directamente
    if (gastosFijosDB.length > 0) {
      return gastosFijosDB
        .filter(g => g.activo)
        .map(g => ({
          descripcion:      g.descripcion,
          categoria:        g.categoria as unknown as Categoria,
          monto_promedio:   g.monto,
          meses_detectados: 0, // no aplica para registros manuales
        }))
        .sort((a, b) => b.monto_promedio - a.monto_promedio)
        .slice(0, 8)
    }
    // Fallback: auto-deteccion por frecuencia en historial de gastos
    const byDesc = new Map<string, GastoRow[]>()
    gastos.forEach(g => {
      const key = g.descripcion.toLowerCase().trim().slice(0, 35)
      if (!byDesc.has(key)) byDesc.set(key, [])
      byDesc.get(key)!.push(g)
    })
    const fijos: GastoFijo[] = []
    byDesc.forEach(rows => {
      const meses = new Set(rows.map(r => r.fecha.slice(0, 7)))
      if (meses.size >= 2) {
        fijos.push({
          descripcion:      rows[0].descripcion,
          categoria:        rows[0].categoria,
          monto_promedio:   rows.reduce((s, r) => s + r.monto, 0) / rows.length,
          meses_detectados: meses.size,
        })
      }
    })
    return fijos.sort((a, b) => b.monto_promedio - a.monto_promedio).slice(0, 8)
  }, [gastosFijosDB, gastos])

  // ── Avalanche ─────────────────────────────────────────────────────────────────

  const avalanche = useMemo((): DeudaAvalanche[] => {
    return [...creditos]
      .filter(c => c.monto_total - c.monto_pagado > 0)
      .sort((a, b) => b.tasa_interes - a.tasa_interes)
      .map(c => {
        const pendiente    = c.monto_total - c.monto_pagado
        const tasaMensual  = c.tasa_interes / 100 / 12
        const pagoEstimado = Math.max(pendiente * 0.03, 50)
        let meses: number
        if (tasaMensual > 0 && pagoEstimado > pendiente * tasaMensual) {
          meses = Math.ceil(
            -Math.log(1 - (tasaMensual * pendiente) / pagoEstimado) /
            Math.log(1 + tasaMensual),
          )
        } else {
          meses = Math.ceil(pendiente / pagoEstimado)
        }
        return {
          id: c.id, nombre: c.nombre,
          pendiente, tasa_interes: c.tasa_interes,
          pago_estimado: pagoEstimado,
          meses_estimados: isFinite(meses) ? meses : 999,
        }
      })
  }, [creditos])

  // ── # Tranquilidad ────────────────────────────────────────────────────────────

  const fire = useMemo(() => {
    const gastosMensual       = totalGastosMes || gastosE_period
    const patrimonioNecesario = gastosMensual * 12 / (tasaRetorno / 100)
    const patrimonioActual    =
      saldos.reduce((s, a) => s + a.saldo, 0) +
      ahorros.reduce((s, a) => s + a.monto_actual, 0) +
      inversiones.reduce((s, i) => s + i.precio_actual * i.cantidad, 0)
    return {
      gastosMensual,
      patrimonioNecesario,
      patrimonioActual,
      porcentaje: pct(patrimonioActual, patrimonioNecesario || 1),
    }
  }, [totalGastosMes, gastosE_period, saldos, ahorros, inversiones, tasaRetorno])

  // ── Recomendaciones IA ────────────────────────────────────────────────────────

  async function pedirRecomendaciones() {
    if (!user) return
    setRecsLoading(true); setRecsError(null); setRecs([])
    try {
      const datos = {
        periodo:                  period,
        total_ingresos:           Math.round(totalIngresos),
        gastos_esenciales:        Math.round(gastosE_period),
        gastos_no_esenciales:     Math.round(gastosNE_period),
        flujo_libre:              Math.round(flujoLibre),
        deuda_mensual_estimada:   Math.round(deudaMensual),
        total_deuda_pendiente:    Math.round(creditos.reduce((s, c) => s + (c.monto_total - c.monto_pagado), 0)),
        score_salud:              score,
        ratio_esencial_pct:       Math.round(ratioEsencial * 100),
        ratio_deudas_pct:         Math.round(ratioDeudas * 100),
        ratio_ahorro_pct:         Math.round(ratioAhorro * 100),
        gig_promedio_semana:      Math.round(gigSemanas.promedio),
        gig_semana_actual:        Math.round(gigSemanas.semanas[0].total),
        patrimonio_actual:        Math.round(fire.patrimonioActual),
        patrimonio_necesario_fire: Math.round(fire.patrimonioNecesario),
        num_deudas_activas:       creditos.filter(c => c.monto_total - c.monto_pagado > 0).length,
        categorias:               categorias.map(c => ({ grupo: c.nombre, monto: Math.round(c.monto), tipo: c.tipo })),
      }
      const res  = await fetch(CLAUDE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos }),
      })
      const data = await res.json() as { recomendaciones?: string[]; error?: string }
      if (data.error) throw new Error(data.error)
      setRecs(data.recomendaciones ?? [])
    } catch (e) {
      setRecsError((e as Error).message)
    } finally {
      setRecsLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="sal-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 10, color: 'var(--text-muted)' }}>
        <Loader2 size={22} className="spin" /> Cargando datos financieros…
      </div>
    )
  }

  const periodLabel = period === 'Hoy' ? 'de hoy' : period === 'Semana' ? 'semana' : period === 'Año' ? 'del año' : 'del mes'
  const totalGastosPeriod = gastosE_period + gastosNE_period

  return (
    <div className="sal-page">

      {/* HEADER */}
      <div className="sal-header">
        <div>
          <h1 className="sal-title">Salud Financiera</h1>
          <p className="sal-subtitle">Análisis basado en tus datos reales · {period}</p>
        </div>
      </div>

      {/* TOP ROW: SCORE + FLUJO */}
      <div className="sal-top-grid">

        <div className="sal-card sal-card--score">
          <div className="sal-card__label"><Activity size={14} /> Score · mes actual</div>
          <div className="sal-score-wrap">
            <svg viewBox="0 0 120 120" className="sal-ring-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg3)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke={scoreColor} strokeWidth="10"
                strokeDasharray={`${Math.round(score * 3.14)} 314`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="sal-score-center">
              <span className="sal-score-num" style={{ color: scoreColor }}>{score}</span>
              <span className="sal-score-tag" style={{ color: scoreColor }}>{scoreLabel}</span>
            </div>
          </div>
          <div className="sal-score-metrics">
            <div className="sal-metric">
              <span className="sal-metric__name">Esenciales</span>
              <span className="sal-metric__val" style={{ color: ratioEsencial > 0.50 ? 'var(--red)' : 'var(--green)' }}>
                {Math.round(ratioEsencial * 100)}% <small>ideal &lt;50%</small>
              </span>
            </div>
            <div className="sal-metric">
              <span className="sal-metric__name">Servicio deuda</span>
              <span className="sal-metric__val" style={{ color: ratioDeudas > 0.30 ? 'var(--red)' : 'var(--green)' }}>
                {Math.round(ratioDeudas * 100)}% <small>ideal &lt;30%</small>
              </span>
            </div>
            <div className="sal-metric">
              <span className="sal-metric__name">Ahorro potencial</span>
              <span className="sal-metric__val" style={{ color: ratioAhorro < 0.05 ? 'var(--red)' : ratioAhorro < 0.20 ? 'var(--gold)' : 'var(--green)' }}>
                {Math.round(ratioAhorro * 100)}% <small>ideal &gt;20%</small>
              </span>
            </div>
          </div>
        </div>

        <div className="sal-card sal-card--flujo">
          <div className="sal-card__label"><TrendingUp size={14} /> Flujo de Caja · {periodLabel}</div>
          <div className="sal-flujo-list">
            <div className="sal-flujo-row sal-flujo-row--pos">
              <span>Ingresos totales</span>
              <span>+{fmt(totalIngresos)}</span>
            </div>
            <div className="sal-flujo-row">
              <span>Gastos Esenciales (E)</span>
              <span style={{ color: 'var(--red)' }}>−{fmt(gastosE_period)}</span>
            </div>
            <div className="sal-flujo-row">
              <span>Gastos No Esenciales (NE)</span>
              <span style={{ color: 'var(--red)' }}>−{fmt(gastosNE_period)}</span>
            </div>
            <div className="sal-flujo-row">
              <span>Servicio deuda est.</span>
              <span style={{ color: 'var(--blue)' }}>−{fmt(deudaMensual)}</span>
            </div>
            <div className="sal-flujo-divider" />
            <div className="sal-flujo-row sal-flujo-row--total">
              <span>Flujo Libre</span>
              <span style={{ color: flujoLibre >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {flujoLibre >= 0 ? '+' : '−'}{fmt(flujoLibre)}
              </span>
            </div>
            <div className="sal-flujo-row sal-flujo-row--ahorro">
              <span>Flujo con Ahorro (meta 20%)</span>
              <span style={{ color: flujoConAhorro >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {flujoConAhorro >= 0 ? '+' : '−'}{fmt(flujoConAhorro)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* CATEGORÍAS */}
      <div className="sal-card">
        <div className="sal-card__label"><TrendingDown size={14} /> Gastos por Categoría · {periodLabel}</div>
        {totalGastosPeriod === 0 ? (
          <p className="sal-empty">Sin gastos en este período</p>
        ) : (
          <div className="sal-cat-list">
            {categorias.filter(c => c.monto > 0).map(c => (
              <div key={c.nombre} className="sal-cat-row">
                <div className="sal-cat-info">
                  <span className="sal-cat-badge" style={{ background: c.color + '22', color: c.color }}>{c.nombre}</span>
                  <span className={`sal-tipo sal-tipo--${c.tipo.toLowerCase()}`}>{c.tipo}</span>
                </div>
                <div className="sal-cat-bar-wrap">
                  <div className="sal-cat-bar">
                    <div className="sal-cat-bar__fill" style={{ width: `${c.porcentaje}%`, background: c.color }} />
                  </div>
                  <span className="sal-cat-pct">{c.porcentaje}%</span>
                </div>
                <span className="sal-cat-monto">{fmt(c.monto)}</span>
              </div>
            ))}
            <div className="sal-cat-total">
              <span>Total gastos {periodLabel}</span>
              <span>{fmt(totalGastosPeriod)}</span>
            </div>
          </div>
        )}
      </div>

      {/* INGRESO VARIABLE GIG */}
      <div className="sal-card">
        <div className="sal-card__label"><Zap size={14} /> Ingreso Variable K'Drive · últimas 4 semanas</div>
        <div className="sal-gig-stats">
          {[
            { label: 'Semana actual',   val: gigSemanas.semanas[0].total, color: 'var(--gold)' },
            { label: 'Promedio 4 sem.', val: gigSemanas.promedio,         color: 'var(--green)' },
            { label: 'Mínimo',          val: gigSemanas.minimo,           color: 'var(--red)' },
            { label: 'Máximo',          val: gigSemanas.maximo,           color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="sal-gig-stat">
              <span className="sal-gig-stat__label">{s.label}</span>
              <span className="sal-gig-stat__val" style={{ color: s.color }}>{fmt(s.val)}</span>
            </div>
          ))}
        </div>
        <div className="sal-gig-bars">
          {gigSemanas.semanas.map(s => {
            const h = gigSemanas.maximo > 0 ? Math.round((s.total / gigSemanas.maximo) * 100) : 0
            return (
              <div key={s.semana} className="sal-gig-bar-col">
                <span className="sal-gig-bar-val">{s.total > 0 ? fmt(s.total) : '—'}</span>
                <div className="sal-gig-bar-track">
                  <div
                    className="sal-gig-bar-fill"
                    style={{
                      height: `${h}%`,
                      background: s.semana === 1 ? 'var(--gold)' : 'var(--purple)',
                      opacity:    s.semana === 1 ? 1 : 0.55,
                    }}
                  />
                </div>
                <span className="sal-gig-bar-label">Sem {s.semana}</span>
              </div>
            )
          })}
        </div>
        {gigSemanas.promedio > 0 && gigSemanas.semanas[0].total < gigSemanas.promedio * 0.80 && (
          <div className="sal-alert sal-alert--gold">
            <AlertCircle size={14} />
            Semana actual {Math.round((1 - gigSemanas.semanas[0].total / gigSemanas.promedio) * 100)}% por debajo del promedio
          </div>
        )}
      </div>

      {/* GASTOS FIJOS */}
      <div className="sal-card">
        <div className="sal-card__label"><Shield size={14} /> Gastos Fijos Detectados <small className="sal-label-hint">(aparece en 2+ meses)</small></div>
        {gastosFijos.length === 0 ? (
          <p className="sal-empty">Sin gastos fijos detectados. Necesitas historial de 2+ meses.</p>
        ) : (
          <div className="sal-fijos-list">
            {gastosFijos.map((f, i) => (
              <div key={i} className="sal-fijo-row">
                <div className="sal-fijo-info">
                  <span className="sal-fijo-desc">{f.descripcion}</span>
                  <span className="sal-fijo-meta">{f.categoria} · {f.meses_detectados} meses</span>
                </div>
                <span className="sal-fijo-monto">{fmt(f.monto_promedio)}/mes</span>
              </div>
            ))}
            <div className="sal-fijos-total">
              <span>Total fijos estimados</span>
              <span>{fmt(gastosFijos.reduce((s, f) => s + f.monto_promedio, 0))}/mes</span>
            </div>
          </div>
        )}
      </div>

      {/* AVALANCHE */}
      <div className="sal-card">
        <div className="sal-card__label"><CreditCard size={14} /> Estrategia Avalanche — Mayor interés primero</div>
        {avalanche.length === 0 ? (
          <p className="sal-empty">Sin deudas activas</p>
        ) : (
          <div className="sal-aval-list">
            {avalanche.map((d, i) => (
              <div key={d.id} className={`sal-aval-row ${i === 0 ? 'sal-aval-row--first' : ''}`}>
                <div className="sal-aval-orden" style={{ color: i === 0 ? 'var(--red)' : 'var(--text-muted)' }}>#{i + 1}</div>
                <div className="sal-aval-info">
                  <span className="sal-aval-nombre">{d.nombre}</span>
                  <span className="sal-aval-meta">{d.tasa_interes}% anual · pago est. {fmt(d.pago_estimado)}/mes</span>
                </div>
                <div className="sal-aval-nums">
                  <span className="sal-aval-pendiente">{fmt(d.pendiente)}</span>
                  <span className="sal-aval-meses">~{d.meses_estimados < 999 ? `${d.meses_estimados} meses` : '∞'}</span>
                  <span className="sal-aval-libera">libera {fmt(d.pago_estimado)}/mes</span>
                </div>
              </div>
            ))}
            <div className="sal-aval-total">
              <span>Total mensual liberado al saldar todo</span>
              <span>{fmt(avalanche.reduce((s, d) => s + d.pago_estimado, 0))}/mes</span>
            </div>
          </div>
        )}
      </div>

      {/* # TRANQUILIDAD */}
      <div className="sal-card">
        <div className="sal-card__label"><Target size={14} /> # Tranquilidad — Independencia Financiera</div>
        <div className="sal-fire-grid">
          <div className="sal-fire-stat">
            <span className="sal-fire-stat__label">Gastos mensuales base</span>
            <span className="sal-fire-stat__val">{fmt(fire.gastosMensual)}</span>
          </div>
          <div className="sal-fire-stat">
            <span className="sal-fire-stat__label">Meta patrimonial</span>
            <span className="sal-fire-stat__val" style={{ color: 'var(--gold)' }}>{fmt(fire.patrimonioNecesario)}</span>
          </div>
          <div className="sal-fire-stat">
            <span className="sal-fire-stat__label">Patrimonio actual</span>
            <span className="sal-fire-stat__val" style={{ color: 'var(--green)' }}>{fmt(fire.patrimonioActual)}</span>
          </div>
          <div className="sal-fire-stat">
            <span className="sal-fire-stat__label">Tasa retorno</span>
            <div className="sal-fire-tasa-wrap">
              <input
                type="number" min={1} max={10} step={0.5}
                className="sal-fire-tasa"
                value={tasaRetorno}
                onChange={e => setTasaRetorno(Number(e.target.value))}
              />
              <span>%</span>
            </div>
          </div>
        </div>
        <div className="sal-fire-progress-wrap">
          <div className="sal-fire-bar">
            <div className="sal-fire-bar__fill" style={{ width: `${Math.min(fire.porcentaje, 100)}%` }} />
          </div>
          <span className="sal-fire-pct">{fire.porcentaje}% alcanzado</span>
        </div>
        <p className="sal-fire-formula">Fórmula: gastos × 12 ÷ {tasaRetorno}%. Incluye saldos + ahorros + inversiones manuales.</p>
      </div>

      {/* RECOMENDACIONES IA */}
      <div className="sal-card sal-card--ia">
        <div className="sal-card__label"><Activity size={14} /> Recomendaciones por IA · Claude</div>
        {recs.length === 0 && !recsLoading && !recsError && (
          <div className="sal-ia-cta">
            <p className="sal-ia-desc">
              Claude analiza tus números reales y genera 3 recomendaciones concretas y accionables.
              Personalizadas para tu perfil de trabajador gig.
            </p>
            <button className="sal-btn sal-btn--ia" onClick={pedirRecomendaciones}>
              <Zap size={15} /> Generar recomendaciones
            </button>
          </div>
        )}
        {recsLoading && (
          <div className="sal-ia-loading">
            <Loader2 size={18} className="spin" />
            <span>Analizando tu situación financiera…</span>
          </div>
        )}
        {recsError && (
          <div className="sal-alert sal-alert--red">
            <AlertCircle size={14} /> {recsError}
            <button className="sal-ia-retry" onClick={pedirRecomendaciones}>
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        )}
        {recs.length > 0 && (
          <div className="sal-ia-recs">
            {recs.map((rec, i) => (
              <div key={i} className="sal-ia-rec">
                <div className="sal-ia-rec__num">{i + 1}</div>
                <p className="sal-ia-rec__text">{rec}</p>
              </div>
            ))}
            <button className="sal-ia-refresh" onClick={pedirRecomendaciones} disabled={recsLoading}>
              <RefreshCw size={13} /> Actualizar recomendaciones
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
