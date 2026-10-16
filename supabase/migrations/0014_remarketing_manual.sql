-- TurnoMas · Marca manual de contacto por WhatsApp.
-- Aplica sobre 0007_automatizaciones.sql:
-- `turnos.remarketing_manual_at` para marcar cuando el dueño contacta por WhatsApp o omite.

alter table turnos add column if not exists remarketing_manual_at timestamptz;

create index if not exists turnos_remarketing_manual_idx
  on turnos (negocio_id, fin)
  where estado = 'completado' and remarketing_manual_at is null;