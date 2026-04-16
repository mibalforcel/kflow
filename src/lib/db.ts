/**
 * K'Flow — Data Access Layer
 * Funciones tipadas para cada tabla de Supabase.
 */
import { supabase } from './supabase'
import type {
  IngresoRow, IngresoInsert,
  GastoRow, GastoInsert,
  CreditoRow, CreditoInsert,
  AhorroRow, AhorroInsert,
  SaldoRow, SaldoInsert,
  InversionRow, InversionInsert,
} from './types'

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
  const { data, error } = await supabase
    .from('ingresos')
    .insert(row as never)
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
  const { data, error } = await supabase
    .from('gastos')
    .insert(row as never)
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
  const { data, error } = await supabase
    .from('creditos')
    .insert(row as never)
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
  const { data, error } = await supabase
    .from('ahorros')
    .insert(row as never)
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
  const { data, error } = await supabase
    .from('saldos')
    .insert(row as never)
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
  const { data, error } = await supabase
    .from('inversiones')
    .insert(row as never)
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
