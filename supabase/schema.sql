-- ============================================================
-- Cuentas del Paseo — esquema de Supabase
-- Acceso: LINK ABIERTO (cualquiera con el link lee y escribe).
-- Alcance: UN paseo compartido (todos editan el mismo).
-- IDs de TEXTO generados por el cliente (compatibles con core.js: 'pXXXX'/'eXXXX'),
-- para que cada chulo/persona/gasto se cree de forma optimista y sin pisarse.
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO → Run.
-- Es seguro re-ejecutarlo (las políticas se recrean; ignora avisos de "ya existe"
-- en la sección de realtime si lo corres más de una vez).
-- ============================================================

-- 1) TABLAS -----------------------------------------------------------
create table if not exists people (
  id          text primary key,
  name        text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists expenses (
  id          text primary key,
  concepto    text not null default '',
  dia         text not null default '',
  valor       numeric not null default 0,
  payer_id    text references people(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- El "chulo": una fila por (gasto, persona). Unidad atómica e independiente.
create table if not exists participations (
  expense_id  text not null references expenses(id) on delete cascade,
  person_id   text not null references people(id)   on delete cascade,
  primary key (expense_id, person_id)
);

-- Metadatos del paseo (una sola fila, id=1): el nombre editable del paseo.
create table if not exists trip_meta (
  id    int  primary key default 1 check (id = 1),
  name  text not null default 'Drumcode'
);
insert into trip_meta (id, name) values (1, 'Drumcode')
  on conflict (id) do nothing;

-- 2) RLS — link abierto (acceso total para el rol anónimo) ------------
alter table people         enable row level security;
alter table expenses       enable row level security;
alter table participations enable row level security;
alter table trip_meta      enable row level security;

drop policy if exists open_people  on people;
drop policy if exists open_expense on expenses;
drop policy if exists open_part    on participations;
drop policy if exists open_meta    on trip_meta;

create policy open_people  on people         for all using (true) with check (true);
create policy open_expense on expenses       for all using (true) with check (true);
create policy open_part    on participations for all using (true) with check (true);
create policy open_meta    on trip_meta      for all using (true) with check (true);

-- 3) REALTIME — emitir cambios de estas tablas a los clientes ---------
-- (Si re-ejecutas y dice "is already member of publication", ignóralo.)
alter publication supabase_realtime add table people;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table participations;
alter publication supabase_realtime add table trip_meta;
