-- TurnoMas · Inicio de mora para la gracia de `past_due` en suscripciones.
-- Aplica sobre 0000_init.sql: `negocios.suscripcion_mora_desde` (null = sin
-- mora) marca cuándo empezó el `past_due`; el gate da 5 días de gracia
-- antes de bloquear (ver `lib/onboarding/trial.ts`).
-- Nullifica al activar o cancelar el plan.

alter table negocios add column if not exists suscripcion_mora_desde timestamptz null;
