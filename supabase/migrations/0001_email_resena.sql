-- TurnoMas · Migración 0001 (P2 retención, Módulo 5).
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Idempotente: `if not exists` / bloques DO con chequeo de columna.
--
-- 1) `clientes.email` opcional: la reserva captura Nombre + WhatsApp y
--    email opcional; sin email no hay confirmación ni recordatorios.
-- 2) `turnos.resena_pedida`: el recolector de reseñas (2h post-turno)
--    marca una sola vez para no spamear.

alter table clientes add column if not exists email text null
  check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table turnos add column if not exists resena_pedida boolean not null default false;
