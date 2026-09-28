-- TurnoFijo · Migración inicial (Supabase en blanco → esquema PLAN.md §3).
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Idempotente en buckets; tablas se crean una sola vez.

-- 1. Tablas ---------------------------------------------------------------

create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  duenio_id uuid not null references auth.users (id) on delete cascade unique,
  nombre text not null check (char_length(nombre) between 2 and 80),
  pais char(2) not null default 'ar',
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  suscripcion_estado text not null default 'trial'
    check (suscripcion_estado in ('trial', 'active', 'past_due', 'blocked')),
  suscripcion_mp_id text null,
  blacklist_umbral int not null default 2 check (blacklist_umbral >= 0),
  blacklist_penalidad text not null default 'fullDeposit'
    check (blacklist_penalidad in ('blocked', 'fullDeposit')),
  logo_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pais, slug)
);

-- Secretos integrables: SIN lectura anónima (ver RLS). Precio de exponer
-- tokens es robo de cobros/mensajes; por eso viven fuera de `negocios`.
create table if not exists negocio_secretos (
  negocio_id uuid primary key references negocios (id) on delete cascade,
  mercadopago_access_token text null,
  meta_access_token text null,
  whatsapp_phone_number_id text null,
  waba_id text null
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 80),
  horarios jsonb not null default '{}',
  google_calendar_token text null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null,
  duracion_min int not null check (duracion_min > 0),
  buffer_limpieza_min int not null default 0 check (buffer_limpieza_min >= 0),
  precio_base int not null check (precio_base > 0), -- centavos
  precio_promocional int null check (precio_promocional is null or precio_promocional > 0),
  sena_requerida boolean not null default false,
  sena_porcentaje int not null default 50 check (sena_porcentaje between 1 and 100),
  reembolso_auto boolean not null default true,
  remarketing boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null,
  whatsapp text not null,
  notas text null,
  ausencias int not null default 0 check (ausencias >= 0),
  bloqueado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (negocio_id, whatsapp)
);

create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  staff_id uuid not null references staff (id) on delete restrict,
  servicio_id uuid not null references servicios (id) on delete restrict,
  cliente_id uuid not null references clientes (id) on delete restrict,
  inicio timestamptz not null,
  fin timestamptz null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagado', 'completado', 'cancelado', 'ausente')),
  monto_total int null check (monto_total is null or monto_total >= 0),
  sena_monto int null check (sena_monto is null or sena_monto >= 0),
  sena_porcentaje int null check (sena_porcentaje is null or sena_porcentaje between 1 and 100),
  mp_payment_id text null,
  google_calendar_event_id text null,
  notificacion_enviada boolean not null default false,
  remarketing_enviado boolean not null default false,
  fotos jsonb null, -- galería "antes y después"
  created_at timestamptz not null default now()
);

create index if not exists staff_por_negocio on staff (negocio_id);
create index if not exists servicios_por_negocio on servicios (negocio_id);
create index if not exists clientes_por_negocio on clientes (negocio_id);
create index if not exists turnos_por_agenda on turnos (negocio_id, inicio);
create index if not exists turnos_por_cliente on turnos (cliente_id);

-- 2. updated_at automático -------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists negocios_updated_at on negocios;
create trigger negocios_updated_at
  before update on negocios
  for each row execute function set_updated_at();

-- 3. RLS: el dueño ve todo; anónimo solo vistas portal (sin secretos) ------

alter table negocios enable row level security;
alter table negocio_secretos enable row level security;
alter table staff enable row level security;
alter table servicios enable row level security;
alter table clientes enable row level security;
alter table turnos enable row level security;

drop policy if exists "negocios_owner_all" on negocios;
create policy "negocios_owner_all" on negocios
  for all to authenticated
  using (duenio_id = auth.uid())
  with check (duenio_id = auth.uid());

drop policy if exists "secretos_owner_all" on negocio_secretos;
create policy "secretos_owner_all" on negocio_secretos
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = auth.uid()))
  with check (negocio_id in (select id from negocios where duenio_id = auth.uid()));

drop policy if exists "staff_owner_all" on staff;
create policy "staff_owner_all" on staff
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = auth.uid()))
  with check (negocio_id in (select id from negocios where duenio_id = auth.uid()));

drop policy if exists "servicios_owner_all" on servicios;
create policy "servicios_owner_all" on servicios
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = auth.uid()))
  with check (negocio_id in (select id from negocios where duenio_id = auth.uid()));

drop policy if exists "clientes_owner_all" on clientes;
create policy "clientes_owner_all" on clientes
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = auth.uid()))
  with check (negocio_id in (select id from negocios where duenio_id = auth.uid()));

drop policy if exists "turnos_owner_all" on turnos;
create policy "turnos_owner_all" on turnos
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = auth.uid()))
  with check (negocio_id in (select id from negocios where duenio_id = auth.uid()));

-- Vistas públicas del portal `/:pais/:slug` (Módulo 2): solo columnas seguras.
create or replace view portal_negocios as
  select id, nombre, pais, slug, logo_url from negocios;

create or replace view portal_staff as
  select id, negocio_id, nombre, horarios from staff where activo = true;

create or replace view portal_servicios as
  select id, negocio_id, nombre, duracion_min, buffer_limpieza_min,
    precio_base, precio_promocional, sena_requerida, sena_porcentaje
  from servicios where activo = true;

grant select on portal_negocios, portal_staff, portal_servicios to anon, authenticated;

-- 4. Storage: logos/avatares y galería "antes y después" --------------------

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true), ('galeria', 'galeria', true)
on conflict (id) do nothing;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('logos', 'galeria'));

drop policy if exists "storage_owner_write" on storage.objects;
create policy "storage_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('logos', 'galeria'));

drop policy if exists "storage_owner_update" on storage.objects;
create policy "storage_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('logos', 'galeria'));

drop policy if exists "storage_owner_delete" on storage.objects;
create policy "storage_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('logos', 'galeria'));
