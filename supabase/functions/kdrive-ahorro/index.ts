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
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { email?: string; tax_reserve?: number; maint_reserve?: number; fecha?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, tax_reserve, maint_reserve, fecha } = body
  if (!email || typeof email !== 'string') return json({ error: 'Campo requerido: email' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Buscar user por email
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (usersErr) {
    console.error('listUsers error:', usersErr.message)
    return json({ error: 'Error buscando usuario' }, 500)
  }

  const user = usersData.users.find(u => u.email === email)
  if (!user) return json({ error: 'Usuario no encontrado' }, 404)

  const userId = user.id

  async function upsertAhorro(
    patterns: string[],
    amount: number,
    defaultNombre: string,
  ): Promise<void> {
    if (!amount || amount <= 0) return

    // Buscar meta existente
    const { data: rows } = await supabase
      .from('ahorros')
      .select('id, monto_actual')
      .eq('user_id', userId)

    const match = (rows ?? []).find((r: { id: string; monto_actual: number; nombre?: string }) => {
      // Re-fetch with nombre to filter
      return false // placeholder — hacemos fetch con ilike abajo
    })
    void match

    // Buscar con ILIKE por cada patrón
    let found: { id: string; monto_actual: number } | null = null
    for (const pattern of patterns) {
      const { data } = await supabase
        .from('ahorros')
        .select('id, monto_actual')
        .eq('user_id', userId)
        .ilike('nombre', `%${pattern}%`)
        .limit(1)
        .maybeSingle()
      if (data) { found = data as { id: string; monto_actual: number }; break }
    }

    if (found) {
      await supabase
        .from('ahorros')
        .update({ monto_actual: found.monto_actual + amount })
        .eq('id', found.id)
    } else {
      await supabase
        .from('ahorros')
        .insert({
          user_id: userId,
          nombre: defaultNombre,
          monto_objetivo: 0,
          monto_actual: amount,
          fecha_objetivo: null,
        } as never)
    }
  }

  await Promise.all([
    upsertAhorro(['IRS', 'Tax', 'impuesto', 'Impuesto'], tax_reserve ?? 0, 'Reserva IRS'),
    upsertAhorro(['manten', 'Manten', 'auto', 'Auto', 'carro', 'Carro'], maint_reserve ?? 0, 'Reserva Mantenimiento'),
  ])

  console.log(`kdrive-ahorro: user=${userId} fecha=${fecha} tax=${tax_reserve} maint=${maint_reserve}`)

  return json({ success: true })
})
