import { useState, useMemo } from 'react'
import { Plus, Wallet, X } from 'lucide-react'
import './Saldos.css'

type TipoCuenta = 'Débito' | 'Crédito' | 'Ahorro' | 'Cash'

interface Cuenta {
  id: string
  nombre: string
  tipo: TipoCuenta
  saldo: number
}

const TIPO_CONFIG: Record<TipoCuenta, { color: string; bg: string }> = {
  'Débito':  { color: 'var(--blue)',   bg: 'rgba(55,138,221,0.15)' },
  'Crédito': { color: 'var(--red)',    bg: 'rgba(226,75,74,0.15)' },
  'Ahorro':  { color: 'var(--green)',  bg: 'rgba(29,158,117,0.15)' },
  'Cash':    { color: 'var(--gold)',   bg: 'rgba(212,160,23,0.15)' },
}

const MOCK: Cuenta[] = [
  { id:  '1', nombre: 'Branch / Uber',  tipo: 'Débito',  saldo: 3240.50  },
  { id:  '2', nombre: 'Cash App',       tipo: 'Débito',  saldo: 1850.00  },
  { id:  '3', nombre: 'Chime',          tipo: 'Débito',  saldo: 4120.75  },
  { id:  '4', nombre: 'MoneyLion',      tipo: 'Ahorro',  saldo: 7500.00  },
  { id:  '5', nombre: 'Global66',       tipo: 'Débito',  saldo: 2300.00  },
  { id:  '6', nombre: 'Capital One',    tipo: 'Crédito', saldo: -3800.00 },
  { id:  '7', nombre: 'Apple Cash',     tipo: 'Cash',    saldo: 620.00   },
  { id:  '8', nombre: 'Bank of America',tipo: 'Débito',  saldo: 5400.00  },
  { id:  '9', nombre: 'OnePay',         tipo: 'Ahorro',  saldo: 2100.00  },
  { id: '10', nombre: 'Wawa',           tipo: 'Cash',    saldo: 80.00    },
]

const TIPOS: TipoCuenta[] = ['Débito', 'Crédito', 'Ahorro', 'Cash']

function fmt(n: number) {
  const abs = Math.abs(n)
  const str = '$' + abs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-${str}` : str
}

export default function Saldos() {
  const [cuentas, setCuentas]   = useState<Cuenta[]>(MOCK)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ nombre: '', tipo: 'Débito' as TipoCuenta, saldo: '' })
  const [errors, setErrors]     = useState<Partial<typeof form>>({})

  const total = useMemo(() => cuentas.reduce((s, c) => s + c.saldo, 0), [cuentas])

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (form.saldo === '' || isNaN(Number(form.saldo))) e.saldo = 'Monto inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const nueva: Cuenta = {
      id: Date.now().toString(),
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      saldo: Number(form.saldo),
    }
    setCuentas(prev => [...prev, nueva])
    setForm({ nombre: '', tipo: 'Débito', saldo: '' })
    setErrors({})
    setShowForm(false)
  }

  return (
    <div className="sal-page">

      <div className="sal-header">
        <div>
          <h1 className="sal-title">Saldos</h1>
          <p className="sal-subtitle">Cuentas consolidadas</p>
        </div>
        <button className="sal-btn sal-btn--gold" onClick={() => setShowForm(v => !v)}>
          <Plus size={15} /> Agregar Cuenta
        </button>
      </div>

      {/* TOTAL CONSOLIDADO */}
      <div className="sal-total-card">
        <div className="sal-total-card__left">
          <div className="sal-total-card__icon"><Wallet size={20} color="var(--gold)" /></div>
          <div>
            <div className="sal-total-card__label">Saldo total consolidado</div>
            <div className="sal-total-card__value" style={{ color: total >= 0 ? 'var(--gold)' : 'var(--red)' }}>
              {fmt(total)}
            </div>
          </div>
        </div>
        <div className="sal-total-card__right">
          <div className="sal-total-stat">
            <span className="sal-total-stat__label">Cuentas</span>
            <span className="sal-total-stat__val">{cuentas.length}</span>
          </div>
          <div className="sal-total-stat">
            <span className="sal-total-stat__label">Positivas</span>
            <span className="sal-total-stat__val" style={{ color: 'var(--green)' }}>{cuentas.filter(c => c.saldo >= 0).length}</span>
          </div>
          <div className="sal-total-stat">
            <span className="sal-total-stat__label">Negativas</span>
            <span className="sal-total-stat__val" style={{ color: 'var(--red)' }}>{cuentas.filter(c => c.saldo < 0).length}</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="sal-form-wrap">
          <div className="sal-form-header">
            <span>Nueva cuenta</span>
            <button className="sal-close" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form className="sal-form" onSubmit={handleSubmit} noValidate>
            <div className="sal-form__row">
              <div className="sal-field">
                <label className="sal-label">Nombre del banco / wallet</label>
                <input type="text" className={`sal-input ${errors.nombre ? 'sal-input--error' : ''}`} placeholder="Ej. Chase, Venmo..." value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                {errors.nombre && <span className="sal-error">{errors.nombre}</span>}
              </div>
              <div className="sal-field">
                <label className="sal-label">Tipo</label>
                <select className="sal-input sal-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCuenta }))}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="sal-field">
              <label className="sal-label">Saldo actual ($)</label>
              <input type="number" step="0.01" className={`sal-input ${errors.saldo ? 'sal-input--error' : ''}`} placeholder="0.00 (negativo si es deuda)" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} />
              {errors.saldo && <span className="sal-error">{errors.saldo}</span>}
            </div>
            <div className="sal-form__actions">
              <button type="button" className="sal-btn sal-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="sal-btn sal-btn--gold"><Plus size={14} /> Agregar Cuenta</button>
            </div>
          </form>
        </div>
      )}

      <div className="sal-grid">
        {cuentas.map(c => {
          const cfg = TIPO_CONFIG[c.tipo]
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
      </div>
    </div>
  )
}
