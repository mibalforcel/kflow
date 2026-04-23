import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = 'https://kflow-six.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { user_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { user_id } = body
  if (!user_id || typeof user_id !== 'string') {
    return json({ error: 'Campo requerido: user_id' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: conn, error: connErr } = await supabase
    .from('plaid_connections')
    .select('access_token, institution_name')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (connErr) {
    console.error('plaid_connections error:', connErr.message)
    return json({ error: 'Error buscando conexión bancaria' }, 500)
  }
  if (!conn) return json({ error: 'No hay banco conectado para este usuario' }, 404)

  const clientId = Deno.env.get('PLAID_CLIENT_ID')
  const secret   = Deno.env.get('PLAID_SECRET')
  const plaidEnv = Deno.env.get('PLAID_ENV') ?? 'sandbox'

  if (!clientId || !secret) return json({ error: 'Plaid credentials not configured' }, 500)

  const plaidRes = await fetch(`https://${plaidEnv}.plaid.com/accounts/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:    clientId,
      secret,
      access_token: conn.access_token,
    }),
  })

  const data = await plaidRes.json()

  if (!plaidRes.ok) {
    console.error('Plaid accounts/get error:', data)
    return json({ error: data.error_message ?? 'Error al obtener cuentas' }, 502)
  }

  const accounts = (data.accounts ?? []).map((a: {
    account_id: string
    name: string
    type: string
    subtype: string | null
    balances: { current: number | null; available: number | null }
  }) => ({
    account_id: a.account_id,
    name:       a.name,
    type:       a.type,
    subtype:    a.subtype,
    balances:   { current: a.balances.current, available: a.balances.available },
  }))

  return json({ accounts, institution_name: conn.institution_name })
})
