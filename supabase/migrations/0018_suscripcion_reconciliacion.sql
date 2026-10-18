-- TurnoMas · Espejo del estado de la suscripción de MercadoPago y reconciliación.
-- Aplica sobre 0000_init.sql, 0009_suscripcion_mora.sql y 0017_suscripcion_vence.sql.
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
--
-- `suscripcion_mp_status` espeja el estado del preapproval en MP
-- (`authorized`/`cancelled`/`paused`). Con `authorized`, el gate no bloquea por
-- vencimiento (MP va a renovar), evitando falsos paywalls cuando el webhook o
-- la reconciliación todavía no confirmaron la renovación.
--
-- `suscripcion_verificada_en` marca la última reconciliación exitosa contra MP
-- (webhook o cron). Se usa como caché del rescate en línea del middleware y
-- para que el cron dirigido sólo revise el subconjunto en riesgo.

alter table negocios add column if not exists suscripcion_mp_status text null;
alter table negocios add column if not exists suscripcion_verificada_en timestamptz null;

-- Cron dirigido: acota la reconciliación a las suscripciones en riesgo por
-- vencimiento, sin escanear toda la tabla.
create index if not exists negocios_suscripcion_riesgo
  on negocios (suscripcion_vence_en)
  where suscripcion_mp_id is not null;
