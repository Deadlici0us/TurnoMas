-- TurnoMas · Vencimiento del período pago y cancelación diferida.
-- Aplica sobre 0000_init.sql y 0009_suscripcion_mora.sql.
--
-- `suscripcion_vence_en` guarda el fin del período pago (el `next_payment_date`
-- que MercadoPago informa al activar/cobrar). Permite saber cuántos días quedan
-- de suscripción y hasta cuándo dar acceso tras una cancelación.
--
-- `suscripcion_cancelada_en` marca que el usuario canceló el débito automático
-- sin cortar el acceso: el gate mantiene el plan activo hasta que pase
-- `suscripcion_vence_en`, y recién ahí bloquea (ver `lib/onboarding/trial.ts`).

alter table negocios add column if not exists suscripcion_vence_en timestamptz null;
alter table negocios add column if not exists suscripcion_cancelada_en timestamptz null;
