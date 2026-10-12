-- TurnoMas · Consolidación de vistas del portal (fix 404 en /:pais/:slug).
-- Idempotente: re-aplica columnas de 0004 (horarios), 0005 (timezone) y
-- re-declara las tres vistas públicas con SECURITY INVOKER + grants.
-- Correr en cualquier entorno cuya DB haya quedado a mitad de camino
-- (caso detectado: portal_negocios sin `horarios`/`timezone` → la query
-- del portal falla y la página devuelve 404 aunque el negocio exista).

alter table negocios add column if not exists horarios jsonb not null default '{}';

alter table negocios add column if not exists timezone text not null default 'America/Argentina/Buenos_Aires';

create or replace view portal_negocios with (security_invoker = true) as
  select id, nombre, pais, slug, logo_url, horarios, timezone from negocios;

create or replace view portal_staff with (security_invoker = true) as
  select id, negocio_id, nombre, horarios from staff where activo = true;

create or replace view portal_servicios with (security_invoker = true) as
  select id, negocio_id, nombre, duracion_min,
    precio_base, precio_promocional, sena_requerida, sena_porcentaje
  from servicios where activo = true;

grant select on portal_negocios, portal_staff, portal_servicios to anon, authenticated;
