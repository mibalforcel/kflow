/**
 * K'Flow — Utilidades de fecha en timezone America/New_York (Eastern Time)
 * Usar estas funciones en lugar de new Date().toISOString().slice(0,10)
 * para evitar que el "día" se corte a las 7pm hora Filadelfia.
 */

const TZ = 'America/New_York'

/** Fecha actual en ET → "YYYY-MM-DD" */
export function todayET(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Hace 6 días en ET → "YYYY-MM-DD" (incluye hoy = ventana de 7 días) */
export function sevenDaysAgoET(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Mes actual en ET → "YYYY-MM" */
export function thisMonthET(): string {
  return todayET().slice(0, 7)
}

/** Año actual en ET → "YYYY" */
export function thisYearET(): string {
  return todayET().slice(0, 4)
}

/** Convierte cualquier Date a "YYYY-MM-DD" en ET */
export function dateToET(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}
