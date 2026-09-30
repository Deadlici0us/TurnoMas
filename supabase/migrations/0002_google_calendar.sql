-- TurnoMas · Migración 0002 (Google Calendar por negocio, Módulo 3).
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Idempotente: `if not exists` para correrla sin romper datos existentes.

alter table negocio_secretos add column if not exists google_refresh_token text null;
alter table negocio_secretos add column if not exists google_email text null;
alter table negocio_secretos add column if not exists google_conectado_at timestamptz null;
