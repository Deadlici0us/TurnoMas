-- TurnoMas · Perfil del equipo: foto, descripción y servicios que brinda.
-- Idempotente: columnas con `if not exists`, constraint re-creable, tabla y
-- vistas re-declarables. Backfill: los negocios existentes conservan todos sus
-- servicios para todos sus profesionales (nada se rompe al migrar); a partir de
-- acá, un profesional nuevo arranca sin servicios y el dueño los asigna.

alter table staff add column if not exists foto_url text null;

alter table staff add column if not exists descripcion text null;

alter table staff drop constraint if exists staff_descripcion_check;
alter table staff add constraint staff_descripcion_check
  check (descripcion is null or char_length(descripcion) <= 280);

-- Vínculo profesional ↔ servicio (N:N dentro de un mismo negocio).
create table if not exists staff_servicios (
  staff_id uuid not null references staff (id) on delete cascade,
  servicio_id uuid not null references servicios (id) on delete cascade,
  negocio_id uuid not null references negocios (id) on delete cascade,
  primary key (staff_id, servicio_id)
);

create index if not exists staff_servicios_por_negocio on staff_servicios (negocio_id);

create index if not exists staff_servicios_por_servicio on staff_servicios (servicio_id);

alter table staff_servicios enable row level security;

drop policy if exists "staff_servicios_owner_all" on staff_servicios;
create policy "staff_servicios_owner_all" on staff_servicios
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

drop policy if exists "staff_servicios_portal_anon" on staff_servicios;
create policy "staff_servicios_portal_anon" on staff_servicios
  for select to anon
  using (true);

-- Backfill: asignar todos los servicios existentes a todos los profesionales
-- del mismo negocio para no romper negocios ya configurados.
insert into staff_servicios (staff_id, servicio_id, negocio_id)
  select s.id, sv.id, s.negocio_id
  from staff s
  join servicios sv on sv.negocio_id = s.negocio_id
on conflict (staff_id, servicio_id) do nothing;

create or replace view portal_staff with (security_invoker = true) as
  select id, negocio_id, nombre, horarios, foto_url, descripcion
  from staff where activo = true;

create or replace view portal_staff_servicios with (security_invoker = true) as
  select staff_id, servicio_id, negocio_id from staff_servicios;

grant select on portal_staff, portal_staff_servicios to anon, authenticated;
