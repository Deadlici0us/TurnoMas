-- TurnoMas · Automatizaciones y mensajes configurables por negocio.
-- Aplica sobre 0000_init.sql:
-- `negocios.recordatorio_activo/hs`, `resena_activa/hs`, `remarketing_activo/dias`,
-- plantillas de email personalizables (`msg_*`, null = default) y `google_maps_url`.
-- `servicios.remarketing_dias` (null = hereda el default del negocio).

alter table negocios add column if not exists recordatorio_activo boolean not null default true;
alter table negocios add column if not exists recordatorio_hs int not null default 24
  check (recordatorio_hs between 1 and 72);
alter table negocios add column if not exists resena_activa boolean not null default true;
alter table negocios add column if not exists resena_hs int not null default 2
  check (resena_hs between 1 and 72);
alter table negocios add column if not exists remarketing_activo boolean not null default true;
alter table negocios add column if not exists remarketing_dias int not null default 30
  check (remarketing_dias between 1 and 90);

alter table negocios add column if not exists msg_confirmacion_subject text null;
alter table negocios add column if not exists msg_confirmacion_cuerpo text null;
alter table negocios add column if not exists msg_recordatorio_subject text null;
alter table negocios add column if not exists msg_recordatorio_cuerpo text null;
alter table negocios add column if not exists msg_resena_subject text null;
alter table negocios add column if not exists msg_resena_cuerpo text null;
alter table negocios add column if not exists msg_remarketing_subject text null;
alter table negocios add column if not exists msg_remarketing_cuerpo text null;

alter table negocios add column if not exists google_maps_url text null;

alter table servicios add column if not exists remarketing_dias int null
  check (remarketing_dias is null or remarketing_dias between 1 and 90);
