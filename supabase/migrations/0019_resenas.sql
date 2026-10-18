-- TurnoMas · Reseñas capturadas (feedback privado) y link directo a Google.
-- Aplica sobre 0000_init.sql, 0007_automatizaciones.sql, 0010_portal_views.sql
-- y 0017_suscripcion_vence.sql.
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
--
-- `resenas` guarda el feedback que el cliente deja por el canal privado
-- (Opción B): estrellas + comentario, sin gating. El email invita a TODOS a
-- escribir la reseña en Google (link directo) y, opcionalmente, a contar en
-- privado. El dueño ve estas reseñas en el dashboard y puede marcarlas como
-- resueltas.
--
-- `negocios.google_place_id` permite el link directo de "escribir reseña"
-- (`search.google.com/local/writereview?placeid=...`).

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

-- Una reseña por turno (idempotencia del upsert del API).
create unique index if not exists resenas_turno_unique
  on resenas (turno_id);

-- Listado por negocio (más recientes primero).
create index if not exists resenas_por_negocio
  on resenas (negocio_id, created_at desc);

-- Conteo de pendientes para el badge del dashboard.
create index if not exists resenas_pendientes
  on resenas (negocio_id) where resuelto = false;

alter table resenas enable row level security;

drop policy if exists "resenas_owner_all" on resenas;
create policy "resenas_owner_all" on resenas
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));

-- Link directo de reseña de Google (place id del negocio).
alter table negocios add column if not exists google_place_id text null;

-- El email pasa a ser obligatorio en la reserva sólo cuando el negocio tiene
-- reseñas o recordatorios activos. Se expone un flag derivado en la vista
-- pública para que el formulario marque el campo como requerido.
create or replace view portal_negocios with (security_invoker = true) as
  select id, nombre, pais, slug, logo_url, horarios, timezone,
    coalesce(resena_activa, true) as resena_activa,
    coalesce(recordatorio_activo, true) as recordatorio_activo,
    (coalesce(resena_activa, true) or coalesce(recordatorio_activo, true)) as requiere_email
  from negocios;

grant select on portal_negocios, portal_staff, portal_servicios to anon, authenticated;
