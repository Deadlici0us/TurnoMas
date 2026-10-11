-- TurnoMas · OAuth de MercadoPago por negocio (señas delegadas).
-- Aplica sobre 0000_init.sql + 0002_google_calendar.sql:
-- guarda el `refresh_token` (el `access_token` vence a los 180 días),
-- el `user_id` del vendedor y la fecha de conexión en `negocio_secretos`.
-- Sin lectura anónima (RLS ya vigente en `negocio_secretos`).

alter table negocio_secretos add column if not exists mercadopago_refresh_token text null;
alter table negocio_secretos add column if not exists mercadopago_user_id text null;
alter table negocio_secretos add column if not exists mp_conectado_at timestamptz null;
