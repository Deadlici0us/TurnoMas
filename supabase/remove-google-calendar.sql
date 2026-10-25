begin;

alter table if exists negocio_secretos
  drop column if exists google_refresh_token,
  drop column if exists google_email,
  drop column if exists google_conectado_at;

alter table if exists turnos
  drop column if exists google_calendar_event_id;

commit;
