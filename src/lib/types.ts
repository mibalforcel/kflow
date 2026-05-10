// =============================================
// K'Flow — Database Types
// Generados del esquema Supabase
// =============================================

export type Fuente = "K'Drive" | 'Manual' | 'Otro' | 'Plaid'

export type Currency = 'USD' | 'COP' | 'EUR' | 'MXN' | 'BRL'

export interface UserProfileRow {
  id: string
  display_name: string
  avatar_url: string | null
  currency: Currency
  billing_day: number
  created_at: string
  updated_at: string
}

export type UserProfileInsert = Omit<UserProfileRow, 'id' | 'created_at' | 'updated_at'>

export type Categoria =
  | 'Comida' | 'Gasolina' | 'Renta' | 'Servicios'
  | 'Transporte' | 'Entretenimiento' | 'Otro'

export type TipoCuenta = 'Débito' | 'Crédito' | 'Ahorro' | 'Cash'

export type Estrategia = 'Snowball' | 'Avalanche'

export type CategoriaFijo = 'Hogar' | 'Comida' | 'Transporte' | 'Créditos' | 'Entretenimiento' | 'Familia' | 'Suscripciones'

// =============================================
// Rows (lo que devuelve Supabase)
// =============================================

export interface IngresoRow {
  id: string
  user_id: string | null
  fecha: string
  descripcion: string
  fuente: Fuente
  monto: number
  created_at: string
}

export interface GastoRow {
  id: string
  user_id: string | null
  fecha: string
  descripcion: string
  categoria: Categoria
  monto: number
  fuente?: string   // 'Manual' (default) | 'Plaid' | otros
  created_at: string
}

export interface CreditoRow {
  id: string
  user_id: string | null
  nombre: string
  monto_total: number
  monto_pagado: number
  tasa_interes: number
  proximo_pago: string | null
  estrategia: Estrategia | null
  created_at: string
}

export interface AhorroRow {
  id: string
  user_id: string | null
  nombre: string
  monto_objetivo: number
  monto_actual: number
  fecha_objetivo: string | null
  created_at: string
}

export interface SaldoRow {
  id: string
  user_id: string | null
  nombre: string
  tipo: TipoCuenta | null
  saldo: number
  created_at: string
}

export interface GastoFijoRow {
  id: string
  user_id: string | null
  descripcion: string
  categoria: CategoriaFijo
  monto: number
  tipo: 'E' | 'NE'
  dia_cobro: number | null
  activo: boolean
  created_at: string
}

export interface InversionRow {
  id: string
  user_id: string | null
  ticker: string
  nombre: string
  precio_actual: number
  precio_compra: number
  cantidad: number
  variacion_dia: number
  created_at: string
}

// =============================================
// Inserts (lo que mandamos a Supabase)
// =============================================

export type IngresoInsert  = Omit<IngresoRow,  'id' | 'user_id' | 'created_at'>
export type GastoInsert    = Omit<GastoRow,    'id' | 'user_id' | 'created_at'>
export type CreditoInsert  = Omit<CreditoRow,  'id' | 'user_id' | 'created_at'>
export type AhorroInsert   = Omit<AhorroRow,   'id' | 'user_id' | 'created_at'>
export type SaldoInsert    = Omit<SaldoRow,    'id' | 'user_id' | 'created_at'>
export type InversionInsert = Omit<InversionRow,'id' | 'user_id' | 'created_at'>
export type GastoFijoInsert = Omit<GastoFijoRow, 'id' | 'user_id' | 'created_at'>

// =============================================
// Database interface para createClient<Database>()
// =============================================

export interface Database {
  public: {
    Tables: {
      ingresos:   { Row: IngresoRow;   Insert: IngresoInsert   }
      gastos:     { Row: GastoRow;     Insert: GastoInsert     }
      creditos:   { Row: CreditoRow;   Insert: CreditoInsert   }
      ahorros:    { Row: AhorroRow;    Insert: AhorroInsert    }
      saldos:     { Row: SaldoRow;     Insert: SaldoInsert     }
      inversiones:  { Row: InversionRow;  Insert: InversionInsert  }
      gastos_fijos: { Row: GastoFijoRow;  Insert: GastoFijoInsert }
    }
  }
}
