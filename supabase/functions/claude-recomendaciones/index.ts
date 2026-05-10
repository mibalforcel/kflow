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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY no configurada en el proyecto Supabase' }, 500)
  }

  let datos: unknown
  try {
    const body = await req.json() as { datos?: unknown }
    datos = body.datos
  } catch {
    return json({ error: 'Body JSON inválido' }, 400)
  }

  if (!datos) return json({ error: 'Falta el campo "datos"' }, 400)

  const system = `Eres un asesor financiero especializado en trabajadores gig en USA (Uber, Lyft, DoorDash, Amazon Flex).
Hablas en español. Das consejos directos, concretos y completamente accionables basados en los números reales del usuario.
Nunca sugieres nada ilegal, nunca das consejos genéricos, nunca repites información que el usuario ya sabe.
Eres directo como un contador, no como un chatbot. Si hay un problema urgente, dilo sin rodeos.`

  const userPrompt = `Analiza la situación financiera de este usuario y genera exactamente 3 recomendaciones.

Cada recomendación debe:
- Mencionar números reales del usuario (montos, porcentajes)
- Ser accionable esta semana o este mes
- Ser específica para un trabajador gig en USA
- Estar en español

Datos del usuario:
${JSON.stringify(datos, null, 2)}

Responde ÚNICAMENTE con JSON válido en este formato exacto, sin markdown, sin texto adicional:
{"recomendaciones":["recomendacion 1 aqui","recomendacion 2 aqui","recomendacion 3 aqui"]}`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    return json({ error: `Claude API error ${resp.status}: ${err}` }, 500)
  }

  const result = await resp.json() as { content?: { text: string }[] }
  const text = result.content?.[0]?.text?.trim() ?? ''

  try {
    const parsed = JSON.parse(text) as { recomendaciones?: string[] }
    if (!Array.isArray(parsed.recomendaciones)) throw new Error('formato inválido')
    return json(parsed)
  } catch {
    return json({ error: 'Claude devolvió formato inesperado', raw: text }, 500)
  }
})
