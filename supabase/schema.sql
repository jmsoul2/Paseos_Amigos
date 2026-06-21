-- ============================================================
-- Cuentas del Paseo — esquema de Supabase
-- Acceso: LINK ABIERTO (cualquiera con el link lee y escribe).
-- Alcance: UN paseo compartido (todos editan el mismo).
-- IDs de TEXTO generados por el cliente (compatibles con core.js: 'pXXXX'/'eXXXX'),
-- para que cada chulo/persona/gasto se cree de forma optimista y sin pisarse.
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO → Run.
-- Es seguro re-ejecutarlo: tablas con "if not exists", políticas que se recrean,
-- y la sección de realtime es idempotente (no falla si las tablas ya están).
-- ============================================================

-- 1) TABLAS -----------------------------------------------------------
create table if not exists people (
  id          text primary key,
  name        text not null default '',
  confirmed   boolean not null default false,
  created_at  timestamptz not null default now()
);
-- Migración para tablas ya creadas (seguro re-ejecutar):
alter table people add column if not exists confirmed boolean not null default false;

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

-- Recuerdos: una fila por foto. El archivo vive en Storage (bucket 'recuerdos');
-- aquí guardamos su URL pública, la ruta (para poder borrarlo) y el caption.
create table if not exists memories (
  id          text primary key,
  url         text not null default '',
  path        text not null default '',
  caption     text not null default '',
  created_at  timestamptz not null default now()
);

-- 2) RLS — link abierto (acceso total para el rol anónimo) ------------
alter table people         enable row level security;
alter table expenses       enable row level security;
alter table participations enable row level security;
alter table trip_meta      enable row level security;
alter table memories       enable row level security;

drop policy if exists open_people   on people;
drop policy if exists open_expense  on expenses;
drop policy if exists open_part     on participations;
drop policy if exists open_meta     on trip_meta;
drop policy if exists open_memories on memories;

create policy open_people   on people         for all using (true) with check (true);
create policy open_expense  on expenses       for all using (true) with check (true);
create policy open_part     on participations for all using (true) with check (true);
create policy open_meta     on trip_meta      for all using (true) with check (true);
create policy open_memories on memories       for all using (true) with check (true);

-- 3) REALTIME — emitir cambios de estas tablas a los clientes ---------
-- Idempotente: agrega cada tabla a la publicación SOLO si aún no está, para que
-- re-ejecutar no falle con "is already member of publication" (que en el SQL
-- Editor aborta toda la transacción y deja el bucket/tablas sin crear).
do $$
declare t text;
begin
  foreach t in array array['people','expenses','participations','trip_meta','memories']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- 4) STORAGE — bucket público 'recuerdos' para las fotos -------------
-- Crea el bucket (también se puede hacer desde Storage en el dashboard).
insert into storage.buckets (id, name, public)
  values ('recuerdos', 'recuerdos', true)
  on conflict (id) do update set public = true;

-- Políticas de link abierto sobre los archivos del bucket 'recuerdos'.
-- (Leer es público por la URL; subir/borrar necesitan estas políticas.)
drop policy if exists recuerdos_read   on storage.objects;
drop policy if exists recuerdos_insert on storage.objects;
drop policy if exists recuerdos_delete on storage.objects;
create policy recuerdos_read   on storage.objects for select using (bucket_id = 'recuerdos');
create policy recuerdos_insert on storage.objects for insert with check (bucket_id = 'recuerdos');
create policy recuerdos_delete on storage.objects for delete using (bucket_id = 'recuerdos');
