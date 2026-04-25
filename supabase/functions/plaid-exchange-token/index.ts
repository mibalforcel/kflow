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

  let body: { public_token?: string; user_id?: string; institution_name?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { public_token, user_id, institution_name } = body

  if (!public_token || typeof public_token !== 'string') return json({ error: 'Campo requerido: public_token' }, 400)
  if (!user_id      || typeof user_id      !== 'string') return json({ error: 'Campo requerido: user_id' }, 400)

  const clientId = Deno.env.get('PLAID_CLIENT_ID')
  const secret   = Deno.env.get('PLAID_SECRET')
  const plaidEnv = Deno.env.get('PLAID_ENV') ?? 'sandbox'

  if (!clientId || !secret) {
    return json({ error: 'Plaid credentials not configured' }, 500)
  }

  // Exchange public_token → access_token + item_id
  const exchangeRes = await fetch(`https://${plaidEnv}.plaid.com/item/public_token/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret, public_token }),
  })

  const exchangeData = await exchangeRes.json()

  if (!exchangeRes.ok) {
    console.error('Plaid exchange error:', exchangeData)
    return json({ error: exchangeData.error_message ?? 'Error al intercambiar token' }, 502)
  }

  const { access_token, item_id } = exchangeData

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Deduplicar por item_id: si ya existe, actualizar; si no, insertar
  const { data: existing } = await supabase
    .from('plaid_connections')
    .select('id')
    .eq('user_id', user_id)
    .eq('item_id', item_id)
    .maybeSingle()

  if (existing) {
    const { error: updErr } = await supabase
      .from('plaid_connections')
      .update({ access_token, institution_name: institution_name ?? null })
      .eq('id', existing.id)
    if (updErr) {
      console.error('DB update error:', updErr.message)
      return json({ error: updErr.message }, 500)
    }
  } else {
    const { error: dbErr } = await supabase
      .from('plaid_connections')
      .insert({ user_id, access_token, item_id, institution_name: institution_name ?? null })
    if (dbErr) {
      console.error('DB insert error:', dbErr.message)
      return json({ error: dbErr.message }, 500)
    }
  }

  return json({ success: true })
})
