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

  const clientId = Deno.env.get('PLAID_CLIENT_ID')
  const secret   = Deno.env.get('PLAID_SECRET')
  const plaidEnv = Deno.env.get('PLAID_ENV') ?? 'sandbox'

  if (!clientId || !secret) {
    return json({ error: 'Plaid credentials not configured' }, 500)
  }

  const plaidRes = await fetch(`https://${plaidEnv}.plaid.com/link/token/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     clientId,
      secret,
      client_name:   "K'Flow",
      products:      ['transactions'],
      country_codes: ['US'],
      language:      'es',
      user:          { client_user_id: user_id },
    }),
  })

  const data = await plaidRes.json()

  if (!plaidRes.ok) {
    console.error('Plaid create-link-token error:', data)
    return json({ error: data.error_message ?? 'Error al crear link token' }, 502)
  }

  return json({ link_token: data.link_token })
})
