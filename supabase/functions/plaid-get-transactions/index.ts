import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = 'https://kflow-six.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function firstDayOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface PlaidTransaction {
  transaction_id: string
  name: string
  amount: number
  date: string
  category?: string[]
}

async function fetchAllTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
  clientId: string,
  secret: string,
  plaidEnv: string,
): Promise<PlaidTransaction[]> {
  const all: PlaidTransaction[] = []
  const count = 500
  let offset = 0

  while (true) {
    const res = await fetch(`https://${plaidEnv}.plaid.com/transactions/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:    clientId,
        secret,
        access_token: accessToken,
        start_date:   startDate,
        end_date:     endDate,
        options:      { count, offset },
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error_message ?? 'Error al obtener transacciones')

    const batch: PlaidTransaction[] = data.transactions ?? []
    all.push(...batch)

    if (all.length >= (data.total_transactions ?? 0)) break
    offset += count
  }

  return all
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { user_id?: string; start_date?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { user_id, start_date } = body
  if (!user_id || typeof user_id !== 'string') {
    return json({ error: 'Campo requerido: user_id' }, 400)
  }

  const startDate = (typeof start_date === 'string' && start_date) ? start_date : firstDayOfMonth()
  const endDate   = today()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Obtener TODAS las conexiones del usuario
  const { data: conns, error: connErr } = await supabase
    .from('plaid_connections')
    .select('access_token')
    .eq('user_id', user_id)

  if (connErr) {
    console.error('plaid_connections error:', connErr.message)
    return json({ error: 'Error buscando conexiones bancarias' }, 500)
  }
  if (!conns?.length) return json({ error: 'No hay banco conectado para este usuario' }, 404)

  const clientId = Deno.env.get('PLAID_CLIENT_ID')
  const secret   = Deno.env.get('PLAID_SECRET')
  const plaidEnv = Deno.env.get('PLAID_ENV') ?? 'sandbox'

  if (!clientId || !secret) return json({ error: 'Plaid credentials not configured' }, 500)

  // Merge transacciones de todas las conexiones, dedup por transaction_id
  const seen = new Set<string>()
  const allTransactions: PlaidTransaction[] = []

  for (const conn of conns) {
    try {
      const txs = await fetchAllTransactions(
        conn.access_token, startDate, endDate, clientId, secret, plaidEnv,
      )
      for (const tx of txs) {
        if (!seen.has(tx.transaction_id)) {
          seen.add(tx.transaction_id)
          allTransactions.push(tx)
        }
      }
    } catch (e) {
      console.error(`Error fetching transactions for a connection:`, e)
      // Continuar con las demás conexiones
    }
  }

  return json({ transactions: allTransactions })
})
