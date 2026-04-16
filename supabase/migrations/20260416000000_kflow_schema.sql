-- =============================================
-- K'Flow Schema — Migración inicial
-- =============================================

-- INGRESOS
create table if not exists ingresos (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  fecha       date not null,
  descripcion text not null,
  fuente      text not null check (fuente in ('K''Drive','Manual','Otro')),
  monto       numeric(12,2) not null,
  created_at  timestamptz default now()
);

-- GASTOS
create table if not exists gastos (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  fecha       date not null,
  descripcion text not null,
  categoria   text not null check (categoria in (
    'Comida','Gasolina','Renta','Servicios',
    'Transporte','Entretenimiento','Otro'
  )),
  monto       numeric(12,2) not null,
  created_at  timestamptz default now()
);

-- CRÉDITOS
create table if not exists creditos (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade,
  nombre        text not null,
  monto_total   numeric(12,2) not null,
  monto_pagado  numeric(12,2) default 0,
  tasa_interes  numeric(5,2) default 0,
  proximo_pago  date,
  estrategia    text check (estrategia in ('Snowball','Avalanche')),
  created_at    timestamptz default now()
);

-- AHORROS
create table if not exists ahorros (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  nombre          text not null,
  monto_objetivo  numeric(12,2) not null,
  monto_actual    numeric(12,2) default 0,
  fecha_objetivo  date,
  created_at      timestamptz default now()
);

-- SALDOS
create table if not exists saldos (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  nombre     text not null,
  tipo       text check (tipo in ('Débito','Crédito','Ahorro','Cash')),
  saldo      numeric(12,2) default 0,
  created_at timestamptz default now()
);

-- INVERSIONES
create table if not exists inversiones (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade,
  ticker         text not null,
  nombre         text not null,
  precio_actual  numeric(12,2) not null,
  precio_compra  numeric(12,2) not null,
  cantidad       numeric(16,6) not null,
  variacion_dia  numeric(6,2) default 0,
  created_at     timestamptz default now()
);

-- =============================================
-- RLS
-- =============================================
alter table ingresos   enable row level security;
alter table gastos     enable row level security;
alter table creditos   enable row level security;
alter table ahorros    enable row level security;
alter table saldos     enable row level security;
alter table inversiones enable row level security;

-- =============================================
-- POLÍTICAS — cada usuario ve y edita solo sus datos
-- =============================================

-- INGRESOS
create policy "usuarios ven sus ingresos"
  on ingresos for select using (auth.uid() = user_id);
create policy "usuarios insertan sus ingresos"
  on ingresos for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus ingresos"
  on ingresos for update using (auth.uid() = user_id);
create policy "usuarios eliminan sus ingresos"
  on ingresos for delete using (auth.uid() = user_id);

-- GASTOS
create policy "usuarios ven sus gastos"
  on gastos for select using (auth.uid() = user_id);
create policy "usuarios insertan sus gastos"
  on gastos for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus gastos"
  on gastos for update using (auth.uid() = user_id);
create policy "usuarios eliminan sus gastos"
  on gastos for delete using (auth.uid() = user_id);

-- CRÉDITOS
create policy "usuarios ven sus creditos"
  on creditos for select using (auth.uid() = user_id);
create policy "usuarios insertan sus creditos"
  on creditos for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus creditos"
  on creditos for update using (auth.uid() = user_id);
create policy "usuarios eliminan sus creditos"
  on creditos for delete using (auth.uid() = user_id);

-- AHORROS
create policy "usuarios ven sus ahorros"
  on ahorros for select using (auth.uid() = user_id);
create policy "usuarios insertan sus ahorros"
  on ahorros for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus ahorros"
  on ahorros for update using (auth.uid() = user_id);
create policy "usuarios eliminan sus ahorros"
  on ahorros for delete using (auth.uid() = user_id);

-- SALDOS
create policy "usuarios ven sus saldos"
  on saldos for select using (auth.uid() = user_id);
create policy "usuarios insertan sus saldos"
  on saldos for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus saldos"
  on saldos for update using (auth.uid() = user_id);
create policy "usuarios eliminan sus saldos"
  on saldos for delete using (auth.uid() = user_id);

-- INVERSIONES
create policy "usuarios ven sus inversiones"
  on inversiones for select using (auth.uid() = user_id);
create policy "usuarios insertan sus inversiones"
  on inversiones for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus inversiones"
  on inversiones for update using (auth.uid() = user_id);
create policy "usuarios eliminan sus inversiones"
  on inversiones for delete using (auth.uid() = user_id);
