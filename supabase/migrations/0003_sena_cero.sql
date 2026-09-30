-- TurnoMas · Seña 0% (permite exigir seña sin cobro inicial).
-- Aplica sobre 0000_init.sql: baja el mínimo de 1 a 0.

alter table servicios drop constraint if exists servicios_sena_porcentaje_check;
alter table servicios
  add constraint servicios_sena_porcentaje_check check (sena_porcentaje between 0 and 100);

alter table turnos drop constraint if exists turnos_sena_porcentaje_check;
alter table turnos
  add constraint turnos_sena_porcentaje_check
  check (sena_porcentaje is null or sena_porcentaje between 0 and 100);
