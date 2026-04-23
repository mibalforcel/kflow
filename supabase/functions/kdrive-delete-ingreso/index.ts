import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = 'https://kdrive-opal.vercel.app'

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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Parse body
  let body: { email?: string; descripcion?: string; fecha?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, descripcion, fecha } = body

  // Validate
  if (!email       || typeof email       !== 'string') return json({ error: 'Campo requerido: email' }, 400)
  if (!descripcion || typeof descripcion !== 'string') return json({ error: 'Campo requerido: descripcion' }, 400)
  if (!fecha       || typeof fecha       !== 'string') return json({ error: 'Campo requerido: fecha' }, 400)

  // Service-role client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Buscar user_id por email en auth.users
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    console.error('listUsers error:', listErr.message)
    return json({ error: 'Error buscando usuario' }, 500)
  }

  const match = users.find(u => u.email === email)
  if (!match) {
    return json({ error: `No existe cuenta K'Flow para ${email}` }, 404)
  }

  // Eliminar ingreso que coincida con user_id + descripcion + fecha
  const { error: deleteErr } = await supabase
    .from('ingresos')
    .delete()
    .eq('user_id', match.id)
    .eq('descripcion', descripcion)
    .eq('fecha', fecha)

  if (deleteErr) {
    console.error('delete error:', deleteErr.message)
    return json({ error: deleteErr.message }, 500)
  }

  // Idempotente: si no existía el ingreso (turno anterior a la integración), no es error
  return json({ success: true })
})
