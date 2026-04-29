/**
 * K'Flow — Plaid Sync
 * Lógica compartida de sincronización Plaid usada por Gastos y ProfileModal.
 * amount > 0 en Plaid = gasto (dinero salió)
 * amount < 0 en Plaid = ingreso (depósito, nómina, transferencia entrante)
 */
import { fetchGastos, insertGasto, fetchIngresos, insertIngreso } from './db'
import type { Categoria } from './types'

export const PLAID_CREATE_LINK = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-create-link-token'
export const PLAID_EXCHANGE    = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-exchange-token'
export const PLAID_GET_TX      = 'https://avlnrlidtmukrsivieqa.supabase.co/functions/v1/plaid-get-transactions'
export const PLAID_APIKEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bG5ybGlkdG11a3JzaXZpZXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzA4NzksImV4cCI6MjA5MTk0Njg3OX0.4-MX3X4-mCVhxVyzl-tx79zsPS6zh8inR36HDmY9T9Q'

export const GIG_KEYWORDS = ['uber', 'lyft', 'amazon', 'doordash', 'instacart']

export const PLAID_CAT_MAP: Record<string, Categoria> = {
  'Restaurants':                'Comida',
  'Coffee Shop':                'Comida',
  'Fast Food':                  'Comida',
  'Food and Drink':             'Comida',
  'Supermarkets and Groceries': 'Comida',
  'Gas Stations':               'Gasolina',
  'Taxi':                       'Transporte',
  'Ride Share':                 'Transporte',
  'Airlines':                   'Transporte',
  'Car Service':                'Transporte',
  'Public Transportation':      'Transporte',
  'Transportation':             'Transporte',
  'Travel':                     'Transporte',
  'Gyms and Fitness Centers':   'Entretenimiento',
  'Recreation':                 'Entretenimiento',
  'Entertainment':              'Entretenimiento',
  'Arts and Entertainment':     'Entretenimiento',
  'Utilities':                  'Servicios',
  'Healthcare':                 'Servicios',
  'Service':                    'Servicios',
  'Insurance':                  'Servicios',
  'Telecommunication Services': 'Servicios',
  'Rent':                       'Renta',
  'Rental':                     'Renta',
}

export interface PlaidTx {
  transaction_id: string
  name: string
  amount: number       // positivo = gasto, negativo = depósito/ingreso
  date: string         // YYYY-MM-DD
  category?: string[]
}

export function mapPlaidCategory(categories?: string[]): Categoria {
  if (!categories?.length) return 'Otro'
  for (const cat of [...categories].reverse()) {
    const mapped = PLAID_CAT_MAP[cat]
    if (mapped) return mapped
  }
  return 'Otro'
}

export interface SyncResult {
  gastos: number
  ingresos: number
}

/**
 * Llama a plaid-get-transactions, clasifica por signo de amount,
 * deduplica contra registros existentes e inserta en gastos/ingresos.
 * Retorna los conteos de registros importados.
 */
export async function syncPlaidTransactions(
  userId: string,
  startDate?: string,
): Promise<SyncResult> {
  const res = await fetch(PLAID_GET_TX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...(startDate ? { start_date: startDate } : {}) }),
  })
  const { transactions, error: fnErr } = await res.json() as { transactions?: PlaidTx[]; error?: string }
  if (fnErr) throw new Error(fnErr)
  if (!transactions?.length) return { gastos: 0, ingresos: 0 }

  // Cargar registros existentes para dedup
  const [currentGastos, currentIngresos] = await Promise.all([fetchGastos(), fetchIngresos()])

  let importedGastos  = 0
  let importedIngresos = 0

  for (const tx of transactions) {
    if (tx.amount > 0) {
      // ── GASTO ──────────────────────────────────────────
      // Excluir créditos de plataformas gig
      const nameLower = tx.name.toLowerCase()
      if (GIG_KEYWORDS.some(k => nameLower.includes(k))) continue

      // Dedup: ±$0.50 en misma fecha
      const isDup = currentGastos.some(
        g => g.fecha === tx.date && Math.abs(g.monto - tx.amount) <= 0.50,
      )
      if (isDup) continue

      try {
        await insertGasto({
          fecha:       tx.date,
          descripcion: tx.name,
          monto:       tx.amount,
          categoria:   mapPlaidCategory(tx.category),
          fuente:      'Plaid',
        })
        importedGastos++
      } catch (err) {
        console.error('[plaidSync] Error insertando gasto:', tx.date, tx.name, tx.amount, err)
      }

    } else if (tx.amount < 0) {
      // ── INGRESO ────────────────────────────────────────
      // amount negativo en Plaid = dinero entrante; guardamos el valor absoluto
      const monto = Math.abs(tx.amount)

      // Excluir plataformas gig — esos los registra K'Drive
      const nameLower = tx.name.toLowerCase()
      if (GIG_KEYWORDS.some(k => nameLower.includes(k))) continue

      // Excluir devoluciones mínimas (< $0.50)
      if (monto < 0.50) continue

      // Dedup: ±$0.50 en misma fecha
      const isDup = currentIngresos.some(
        i => i.fecha === tx.date && Math.abs(i.monto - monto) <= 0.50,
      )
      if (isDup) continue

      try {
        await insertIngreso({
          fecha:       tx.date,
          descripcion: tx.name,
          monto,
          fuente:      'Plaid',
        })
        importedIngresos++
      } catch (err) {
        console.error('[plaidSync] Error insertando ingreso:', tx.date, tx.name, monto, err)
      }
    }
  }

  return { gastos: importedGastos, ingresos: importedIngresos }
}
