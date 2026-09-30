-- TurnoMas · Horarios del negocio (techo amplio de reservas).
-- Aplica sobre 0000_init.sql: agrega `negocios.horarios` (JSONB por día,
-- mismo formato que `staff.horarios`) y lo expone en `portal_negocios`.
-- Vacío (`{}`) = sin restricción: solo mandan los horarios del profesional.

alter table negocios add column if not exists horarios jsonb not null default '{}';

create or replace view portal_negocios with (security_invoker = true) as
  select id, nombre, pais, slug, logo_url, horarios from negocios;

grant select on portal_negocios, portal_staff, portal_servicios to anon, authenticated;
