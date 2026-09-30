-- TurnoMas · Zona horaria por negocio (fix agenda lista vs grilla).
-- Aplica sobre 0000_init.sql: `negocios.timezone` IANA (ej. America/Mexico_City).
-- Un país no alcanza (MX/BR/US/ES tienen varios husos): la zona es por negocio.
-- Backfill por país para datos legacy; default Buenos Aires.

alter table negocios add column if not exists timezone text not null default 'America/Argentina/Buenos_Aires';

update negocios set timezone = case lower(pais)
  when 'mx' then 'America/Mexico_City'
  when 'es' then 'Europe/Madrid'
  when 'br' then 'America/Sao_Paulo'
  when 'cl' then 'America/Santiago'
  when 'co' then 'America/Bogota'
  when 'pe' then 'America/Lima'
  when 'uy' then 'America/Montevideo'
  when 'py' then 'America/Asuncion'
  else 'America/Argentina/Buenos_Aires'
end where timezone = 'America/Argentina/Buenos_Aires';

create or replace view portal_negocios with (security_invoker = true) as
  select id, nombre, pais, slug, logo_url, horarios, timezone from negocios;

grant select on portal_negocios, portal_staff, portal_servicios to anon, authenticated;
