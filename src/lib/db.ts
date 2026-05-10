/**
 * K'Flow — Data Access Layer
 * Funciones tipadas para cada tabla de Supabase.
 * El user_id se inyecta automáticamente en cada insert.
 */
import { supabase } from './supabase'
import type {
  IngresoRow, IngresoInsert,
  GastoRow, GastoInsert,
  CreditoRow, CreditoInsert,
  AhorroRow, AhorroInsert,
  SaldoRow, SaldoInsert,
  InversionRow, InversionInsert,
  GastoFijoRow, GastoFijoInsert,
  UserProfileRow, UserProfileInsert,
} from './types'

async function currentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('No autenticado')
  return user.id
}

// ── INGRESOS ─────────────────────────────────────────────

export async function fetchIngresos(): Promise<IngresoRow[]> {
  const { data, error } = await supabase
    .from('ingresos')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as IngresoRow[]
}

export async function insertIngreso(row: IngresoInsert): Promise<IngresoRow> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('ingresos')
    .insert({ ...row, user_id } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as IngresoRow
}

export async function deleteIngreso(id: string): Promise<void> {
  const { error } = await supabase.from('ingresos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── GASTOS ───────────────────────────────────────────────

export async function fetchGastos(): Promise<GastoRow[]> {
  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as GastoRow[]
}

export async function insertGasto(row: GastoInsert): Promise<GastoRow> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('gastos')
    .insert({ ...row, user_id } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as GastoRow
}

export async function deleteGasto(id: string): Promise<void> {
  const { error } = await supabase.from('gastos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── CRÉDITOS ─────────────────────────────────────────────

export async function fetchCreditos(): Promise<CreditoRow[]> {
  const { data, error } = await supabase
    .from('creditos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as CreditoRow[]
}

export async function insertCredito(row: CreditoInsert): Promise<CreditoRow> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('creditos')
    .insert({ ...row, user_id } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CreditoRow
}

export async function updateCredito(id: string, updates: Partial<CreditoInsert>): Promise<CreditoRow> {
  const { data, error } = await supabase
    .from('creditos')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CreditoRow
}

export async function deleteCredito(id: string): Promise<void> {
  const { error } = await supabase.from('creditos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── AHORROS ──────────────────────────────────────────────

export async function fetchAhorros(): Promise<AhorroRow[]> {
  const { data, error } = await supabase
    .from('ahorros')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AhorroRow[]
}

export async function insertAhorro(row: AhorroInsert): Promise<AhorroRow> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('ahorros')
    .insert({ ...row, user_id } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AhorroRow
}

export async function updateAhorro(id: string, updates: Partial<AhorroInsert>): Promise<AhorroRow> {
  const { data, error } = await supabase
    .from('ahorros')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AhorroRow
}

export async function deleteAhorro(id: string): Promise<void> {
  const { error } = await supabase.from('ahorros').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── SALDOS ───────────────────────────────────────────────

export async function fetchSaldos(): Promise<SaldoRow[]> {
  const { data, error } = await supabase
    .from('saldos')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as SaldoRow[]
}

export async function insertSaldo(row: SaldoInsert): Promise<SaldoRow> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('saldos')
    .insert({ ...row, user_id } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as SaldoRow
}

export async function updateSaldo(id: string, updates: Partial<SaldoInsert>): Promise<SaldoRow> {
  const { data, error } = await supabase
    .from('saldos')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as SaldoRow
}

export async function deleteSaldo(id: string): Promise<void> {
  const { error } = await supabase.from('saldos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── INVERSIONES ──────────────────────────────────────────

export async function fetchInversiones(): Promise<InversionRow[]> {
  const { data, error } = await supabase
    .from('inversiones')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as InversionRow[]
}

export async function insertInversion(row: InversionInsert): Promise<InversionRow> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('inversiones')
    .insert({ ...row, user_id } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as InversionRow
}

export async function updateInversion(id: string, updates: Partial<InversionInsert>): Promise<InversionRow> {
  const { data, error } = await supabase
    .from('inversiones')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as InversionRow
}

export async function deleteInversion(id: string): Promise<void> {
  const { error } = await supabase.from('inversiones').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── GASTOS FIJOS ─────────────────────────────────────────

export async function fetchGastosFijos(): Promise<GastoFijoRow[]> {
  const { data, error } = await supabase
    .from('gastos_fijos')
    .select('*')
    .order('categoria', { ascending: true })
    .order('descripcion', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as GastoFijoRow[]
}

export async function insertGastoFijo(row: GastoFijoInsert): Promise<GastoFijoRow> {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('gastos_fijos')
    .insert({ ...row, user_id } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as GastoFijoRow
}

export async function updateGastoFijo(id: string, updates: Partial<GastoFijoInsert>): Promise<GastoFijoRow> {
  const { data, error } = await supabase
    .from('gastos_fijos')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as GastoFijoRow
}

export async function deleteGastoFijo(id: string): Promise<void> {
  const { error } = await supabase.from('gastos_fijos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── PLAID ─────────────────────────────────────────────────

export async function fetchPlaidConnections(): Promise<{ institution_name: string | null }[]> {
  const { data, error } = await supabase
    .from('plaid_connections')
    .select('institution_name')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as { institution_name: string | null }[]
}

export async function fetchPlaidConnectionsFull(): Promise<{ id: string; institution_name: string | null }[]> {
  const { data, error } = await supabase
    .from('plaid_connections')
    .select('id, institution_name')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as { id: string; institution_name: string | null }[]
}

export async function deletePlaidConnection(id: string): Promise<void> {
  const { error } = await supabase.from('plaid_connections').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── USER PROFILE ──────────────────────────────────────────

export async function fetchProfile(): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null // no rows
    throw new Error(error.message)
  }
  return data as UserProfileRow
}

export async function saveProfile(updates: Partial<UserProfileInsert>): Promise<UserProfileRow> {
  const userId = await currentUserId()
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates as never)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as UserProfileRow
}

export async function initProfile(
  userId: string,
  displayName: string,
  avatarUrl: string | null,
): Promise<void> {
  await supabase
    .from('user_profiles')
    .upsert(
      { id: userId, display_name: displayName, avatar_url: avatarUrl, currency: 'USD', billing_day: 1 },
      { ignoreDuplicates: true },
    )
}
