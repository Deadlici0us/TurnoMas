-- TurnoMas · Retención de seña configurable por negocio.
-- Aplica sobre 0000_init.sql: `negocios.sena_retencion_hs` (horas antes del
-- inicio dentro de las cuales cancelar retiene la seña). Default 72hs.

alter table negocios add column if not exists sena_retencion_hs int not null default 72
  check (sena_retencion_hs between 1 and 720);
