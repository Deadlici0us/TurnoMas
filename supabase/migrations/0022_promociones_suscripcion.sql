-- TurnoMas · Promociones porcentuales del plan SaaS.
-- Aplica sobre 0000_init.sql (negocios + set_updated_at) y 0017_suscripcion_vence.sql.
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
--
-- Una fila por negocio: la promo vigente se actualiza/extiende en el lugar.
-- El descuento solo aplica al precio del plan (no a las señas de los turnos).
-- `vigente_hasta` es obligatorio: toda promo nace con vencimiento.
--
-- RLS: el dueño puede leer su promo (para mostrarla en /dashboard/suscripcion).
-- Las escrituras las hace el panel admin con service role.

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

-- Barrido del cron: promos activas próximas a vencer.
create index if not exists promociones_suscripcion_por_vencer
  on promociones_suscripcion (vigente_hasta) where activo = true;

drop trigger if exists promociones_suscripcion_updated_at on promociones_suscripcion;
create trigger promociones_suscripcion_updated_at
  before update on promociones_suscripcion
  for each row execute function set_updated_at();

alter table promociones_suscripcion enable row level security;

drop policy if exists "promociones_suscripcion_owner_select" on promociones_suscripcion;
create policy "promociones_suscripcion_owner_select" on promociones_suscripcion
  for select to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));
