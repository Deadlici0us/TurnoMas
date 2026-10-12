-- TurnoMas · Reembolso idempotente (fix doble devolución de seña).
-- Si el dueño cancela dos veces (doble clic o requests en paralelo),
-- `intentarReembolsoAuto` llamaba a `POST /refunds` de MP sin marca en
-- DB: MercadoPago podía devolver la seña dos veces.
-- `sena_reembolsada` es el candado: se chequea antes de llamar a MP y
-- se marca justo después del refund exitoso. Idempotente y fail-closed
-- (sin marca no hay skip; el turno se cancela igual aunque MP falle).

alter table turnos add column if not exists sena_reembolsada boolean not null default false;

alter table turnos add column if not exists sena_reembolsada_at timestamptz null;
