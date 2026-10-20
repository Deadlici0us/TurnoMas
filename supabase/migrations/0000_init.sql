-- TurnoMas · Esquema inicial consolidado (base Supabase vacía → PLAN.md §3).
-- Cómo aplicarlo: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Este archivo reemplaza las migraciones 0001–0023 y representa el estado
-- final del esquema. Es idempotente para reintentos, pero NO es un script de
-- upgrade: está pensado para crear una base desde cero.
--
-- La demo (Negocio Demo) se sirve en memoria desde `lib/seed/demo-rows.ts` y
-- no inserta filas en Supabase. Para limpiar datos legados de la demo en una
-- base existente, ejecutar una sola vez `supabase/cleanup-demo.sql`.

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
  unique (pais, slug),
  horarios jsonb not null default '{}',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  sena_retencion_hs int not null default 72 check (sena_retencion_hs between 1 and 720),
  recordatorio_activo boolean not null default true,
  recordatorio_hs int not null default 24 check (recordatorio_hs between 1 and 72),
  resena_activa boolean not null default true,
  resena_hs int not null default 2 check (resena_hs between 1 and 72),
  remarketing_activo boolean not null default true,
  remarketing_dias int not null default 30 check (remarketing_dias between 1 and 90),
  msg_confirmacion_subject text null,
  msg_confirmacion_cuerpo text null,
  msg_recordatorio_subject text null,
  msg_recordatorio_cuerpo text null,
  msg_resena_subject text null,
  msg_resena_cuerpo text null,
  msg_remarketing_subject text null,
  msg_remarketing_cuerpo text null,
  google_maps_url text null,
  suscripcion_mora_desde timestamptz null,
  whatsapp text null,
  suscripcion_vence_en timestamptz null,
  suscripcion_cancelada_en timestamptz null,
  suscripcion_mp_status text null,
  suscripcion_verificada_en timestamptz null,
  google_place_id text null,
  descripcion text null,
  constraint negocios_whatsapp_largo
    check (whatsapp is null or char_length(whatsapp) between 7 and 25),
  constraint negocios_descripcion_check
    check (descripcion is null or char_length(descripcion) <= 300)
);

-- Secretos integrables: SIN lectura anónima (ver RLS). Precio de exponer
-- tokens es robo de cobros/mensajes; por eso viven fuera de `negocios`.
create table if not exists negocio_secretos (
  negocio_id uuid primary key references negocios (id) on delete cascade,
  mercadopago_access_token text null,
  meta_access_token text null,
  whatsapp_phone_number_id text null,
  waba_id text null,
  google_refresh_token text null,
  google_email text null,
  google_conectado_at timestamptz null,
  mercadopago_refresh_token text null,
  mercadopago_user_id text null,
  mp_conectado_at timestamptz null
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 80),
  horarios jsonb not null default '{}',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foto_url text null,
  descripcion text null,
  constraint staff_descripcion_check
    check (descripcion is null or char_length(descripcion) <= 280)
);

create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null,
  duracion_min int not null check (duracion_min > 0),
  precio_base int not null check (precio_base > 0), -- centavos
  precio_promocional int null check (precio_promocional is null
    or (precio_promocional > 0 and precio_promocional <= precio_base)),
  sena_requerida boolean not null default false,
  sena_porcentaje int not null default 50,
  reembolso_auto boolean not null default true,
  remarketing boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  remarketing_dias int null,
  constraint servicios_sena_porcentaje_check
    check (sena_porcentaje between 0 and 100),
  constraint servicios_remarketing_dias_check
    check (remarketing_dias is null or remarketing_dias between 1 and 90)
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null,
  whatsapp text not null check (char_length(whatsapp) >= 7),
  notas text null,
  ausencias int not null default 0 check (ausencias >= 0),
  bloqueado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text null,
  unique (negocio_id, whatsapp),
  constraint clientes_email_check
    check (
      email is null
      or (
        char_length(email) <= 254
        and email ~ '^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$'
      )
    )
);

create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  staff_id uuid not null references staff (id) on delete restrict,
  servicio_id uuid not null references servicios (id) on delete restrict,
  cliente_id uuid not null references clientes (id) on delete restrict,
  inicio timestamptz not null,
  fin timestamptz null check (fin is null or fin > inicio),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmado', 'pagado', 'completado', 'cancelado', 'ausente')),
  monto_total int null check (monto_total is null or monto_total >= 0),
  sena_monto int null check (sena_monto is null or sena_monto >= 0),
  sena_porcentaje int null,
  mp_payment_id text null,
  google_calendar_event_id text null,
  notificacion_enviada boolean not null default false,
  remarketing_enviado boolean not null default false,
  fotos jsonb null, -- galería "antes y después"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resena_pedida boolean not null default false,
  sena_reembolsada boolean not null default false,
  sena_reembolsada_at timestamptz null,
  remarketing_manual_at timestamptz null,
  constraint turnos_sena_porcentaje_check
    check (sena_porcentaje is null or sena_porcentaje between 0 and 100)
);

-- mp_payment_id idempotente: un pago confirma un solo turno.
create unique index if not exists turnos_mp_payment_id_unique
  on turnos (mp_payment_id) where mp_payment_id is not null;

create table if not exists reembolsos (
  turno_id uuid primary key references turnos (id) on delete cascade,
  mp_payment_id text not null,
  idempotency_key text not null unique,
  mp_refund_id text null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'ok', 'fallido')),
  error text null,
  created_at timestamptz not null default now()
);

create table if not exists turno_eventos (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references turnos (id) on delete cascade,
  actor text not null check (actor in ('cliente', 'duenio', 'sistema')),
  accion text not null check (accion in ('cancelacion_solicitada',
    'reembolso_ok', 'reembolso_fallido', 'retenida_por_politica',
    'cancelacion_sin_reembolso')),
  detalle jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists suscripcion_pagos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  preapproval_id text not null,
  authorized_payment_id text not null,
  mp_payment_id text null,
  monto_cents int not null check (monto_cents >= 0),
  currency text not null,
  estado text not null,
  fecha timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists resenas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  turno_id uuid not null references turnos (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  estrellas int not null check (estrellas between 1 and 5),
  comentario text null,
  destino text not null check (destino in ('google-maps', 'feedback-interno')),
  resuelto boolean not null default false,
  created_at timestamptz not null default now()
);

-- Vínculo profesional ↔ servicio (N:N dentro de un mismo negocio).
create table if not exists staff_servicios (
  staff_id uuid not null references staff (id) on delete cascade,
  servicio_id uuid not null references servicios (id) on delete cascade,
  negocio_id uuid not null references negocios (id) on delete cascade,
  primary key (staff_id, servicio_id)
);

create table if not exists promociones_suscripcion (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade unique,
  porcentaje int not null check (porcentaje between 1 and 99),
  motivo text null check (motivo is null or char_length(motivo) <= 200),
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz not null,
  activo boolean not null default true,
  sincronizado_en timestamptz null,
  ultimo_error text null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vigente_hasta > vigente_desde)
);

-- 2. updated_at automático -------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists negocios_updated_at on negocios;
create trigger negocios_updated_at
  before update on negocios
  for each row execute function set_updated_at();

drop trigger if exists staff_updated_at on staff;
create trigger staff_updated_at
  before update on staff
  for each row execute function set_updated_at();

drop trigger if exists servicios_updated_at on servicios;
create trigger servicios_updated_at
  before update on servicios
  for each row execute function set_updated_at();

drop trigger if exists clientes_updated_at on clientes;
create trigger clientes_updated_at
  before update on clientes
  for each row execute function set_updated_at();

drop trigger if exists turnos_updated_at on turnos;
create trigger turnos_updated_at
  before update on turnos
  for each row execute function set_updated_at();

drop trigger if exists promociones_suscripcion_updated_at on promociones_suscripcion;
create trigger promociones_suscripcion_updated_at
  before update on promociones_suscripcion
  for each row execute function set_updated_at();

-- 3. Índices calientes (cubren FKs + filtros reales de la app) --------------

create index if not exists staff_por_negocio on staff (negocio_id);
create index if not exists servicios_por_negocio on servicios (negocio_id);
create index if not exists clientes_por_negocio on clientes (negocio_id);
create index if not exists turnos_por_agenda on turnos (negocio_id, inicio);
create index if not exists turnos_por_cliente on turnos (cliente_id);
create index if not exists turnos_por_staff on turnos (staff_id);
create index if not exists turnos_por_servicio on turnos (servicio_id);
create index if not exists turnos_por_staff_agenda on turnos (negocio_id, staff_id, inicio);
create index if not exists turnos_por_negocio_estado on turnos (negocio_id, estado);
create index if not exists turnos_cron_recordatorio on turnos (estado, inicio)
  where notificacion_enviada = false;
create index if not exists turnos_cron_antifantasma on turnos (estado, created_at)
  where estado = 'pendiente';
create index if not exists turnos_cron_resena on turnos (estado, resena_pedida)
  where estado = 'completado';
create index if not exists turnos_remarketing_manual_idx
  on turnos (negocio_id, fin)
  where estado = 'completado' and remarketing_manual_at is null;

create index if not exists turno_eventos_por_turno on turno_eventos (turno_id, created_at);

create unique index if not exists suscripcion_pagos_authorized_unique
  on suscripcion_pagos (authorized_payment_id);
create index if not exists suscripcion_pagos_por_negocio
  on suscripcion_pagos (negocio_id, fecha desc);

create index if not exists negocios_suscripcion_riesgo
  on negocios (suscripcion_vence_en)
  where suscripcion_mp_id is not null;

create unique index if not exists resenas_turno_unique
  on resenas (turno_id);
create index if not exists resenas_por_negocio
  on resenas (negocio_id, created_at desc);
create index if not exists resenas_pendientes
  on resenas (negocio_id) where resuelto = false;

create index if not exists staff_servicios_por_negocio on staff_servicios (negocio_id);
create index if not exists staff_servicios_por_servicio on staff_servicios (servicio_id);

create index if not exists promociones_suscripcion_por_vencer
  on promociones_suscripcion (vigente_hasta) where activo = true;

-- 4. Reembolso atómico e idempotente --------------------------------------

-- Reclama el derecho a reembolsar: solo gana si el turno sigue pagado y
-- sin seña devuelta. Lock de fila: el perdedor paralelo ve ganador=false
-- y no llama a MercadoPago. Idempotente: si ya existe el reclamo ganador,
-- lo devuelve sin duplicar.
create or replace function public.reclamar_reembolso(p_turno_id uuid, p_mp_payment_id text,
  p_idempotency_key text)
returns table (ganador boolean, estado_turno text)
language plpgsql security definer set search_path = '' as $$
declare
  v_estado text;
  v_reembolsada boolean;
begin
  select t.estado, t.sena_reembolsada into v_estado, v_reembolsada
    from public.turnos t where t.id = p_turno_id for update;

  if not found then
    return query select false, null::text;

    return;
  end if;

  if v_estado <> 'pagado' or v_reembolsada then
    return query select false, v_estado;

    return;
  end if;

  insert into public.reembolsos (turno_id, mp_payment_id, idempotency_key, estado)
    values (p_turno_id, p_mp_payment_id, p_idempotency_key, 'pendiente')
    on conflict (turno_id) do nothing;

  if not found then
    return query select false, v_estado;

    return;
  end if;

  return query select true, v_estado;
end;
$$;

revoke all on function public.reclamar_reembolso(uuid, text, text) from public;
grant execute on function public.reclamar_reembolso(uuid, text, text) to service_role;

-- 5. RLS: el dueño ve todo; anónimo solo vistas portal (sin secretos) ------
-- (select auth.uid()) se evalúa una vez (linter: no re-evaluar por fila).

alter table negocios enable row level security;
alter table negocio_secretos enable row level security;
alter table staff enable row level security;
alter table servicios enable row level security;
alter table clientes enable row level security;
alter table turnos enable row level security;
alter table reembolsos enable row level security;
alter table turno_eventos enable row level security;
alter table suscripcion_pagos enable row level security;
alter table resenas enable row level security;
alter table staff_servicios enable row level security;
alter table promociones_suscripcion enable row level security;

drop policy if exists "negocios_owner_all" on negocios;
create policy "negocios_owner_all" on negocios
  for all to authenticated
  using (duenio_id = (select auth.uid()))
  with check (duenio_id = (select auth.uid()));

drop policy if exists "secretos_owner_all" on negocio_secretos;
create policy "secretos_owner_all" on negocio_secretos
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "staff_owner_all" on staff;
create policy "staff_owner_all" on staff
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "servicios_owner_all" on servicios;
create policy "servicios_owner_all" on servicios
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "clientes_owner_all" on clientes;
create policy "clientes_owner_all" on clientes
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "turnos_owner_all" on turnos;
create policy "turnos_owner_all" on turnos
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "suscripcion_pagos_owner_all" on suscripcion_pagos;
create policy "suscripcion_pagos_owner_all" on suscripcion_pagos
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "resenas_owner_all" on resenas;
create policy "resenas_owner_all" on resenas
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "staff_servicios_owner_all" on staff_servicios;
create policy "staff_servicios_owner_all" on staff_servicios
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "promociones_suscripcion_owner_select" on promociones_suscripcion;
create policy "promociones_suscripcion_owner_select" on promociones_suscripcion
  for select to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

-- Lectura anónima mínima del portal público.
drop policy if exists "negocios_portal_anon" on negocios;
create policy "negocios_portal_anon" on negocios
  for select to anon
  using (true);

drop policy if exists "staff_portal_anon" on staff;
create policy "staff_portal_anon" on staff
  for select to anon
  using (activo = true);

drop policy if exists "servicios_portal_anon" on servicios;
create policy "servicios_portal_anon" on servicios
  for select to anon
  using (activo = true);

drop policy if exists "staff_servicios_portal_anon" on staff_servicios;
create policy "staff_servicios_portal_anon" on staff_servicios
  for select to anon
  using (true);

-- 6. Vistas públicas del portal `/:pais/:slug` (Módulo 2) ------------------

-- SECURITY INVOKER: respetan RLS del consultante, no del creador (linter).
create or replace view portal_negocios with (security_invoker = true) as
  select id, nombre, pais, slug, logo_url, horarios, timezone,
    coalesce(resena_activa, true) as resena_activa,
    coalesce(recordatorio_activo, true) as recordatorio_activo,
    (coalesce(resena_activa, true) or coalesce(recordatorio_activo, true)) as requiere_email,
    descripcion,
    google_maps_url
  from negocios;

create or replace view portal_staff with (security_invoker = true) as
  select id, negocio_id, nombre, horarios, foto_url, descripcion
  from staff where activo = true;

create or replace view portal_servicios with (security_invoker = true) as
  select id, negocio_id, nombre, duracion_min,
    precio_base, precio_promocional, sena_requerida, sena_porcentaje
  from servicios where activo = true;

create or replace view portal_staff_servicios with (security_invoker = true) as
  select staff_id, servicio_id, negocio_id from staff_servicios;

grant select on portal_negocios, portal_staff, portal_servicios, portal_staff_servicios
  to anon, authenticated;

-- 7. Storage: logos/avatares y galería "antes y después" --------------------

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
  with check (bucket_id in ('logos', 'galeria')
    and owner = (select auth.uid()));

drop policy if exists "storage_owner_update" on storage.objects;
create policy "storage_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('logos', 'galeria')
    and owner = (select auth.uid()))
  with check (bucket_id in ('logos', 'galeria')
    and owner = (select auth.uid()));

drop policy if exists "storage_owner_delete" on storage.objects;
create policy "storage_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('logos', 'galeria')
    and owner = (select auth.uid()));
