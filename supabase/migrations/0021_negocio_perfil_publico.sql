-- TurnoMas · Perfil público del negocio (logo, descripción y ubicación).
-- Aplica sobre 0000_init.sql, 0010_portal_views.sql y 0019_resenas.sql.
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
--
-- `negocios.descripcion` es la reseña breve que se muestra en el portal
-- público. `google_maps_url` ya existe (0007_automatizaciones.sql) y pasa a
-- exponerse en la vista pública para dibujar el mapa del local.
-- Idempotente: `add column if not exists` + `create or replace view`.

alter table negocios add column if not exists descripcion text null;

alter table negocios drop constraint if exists negocios_descripcion_check;
alter table negocios add constraint negocios_descripcion_check
  check (descripcion is null or char_length(descripcion) <= 300);

-- `create or replace view` sólo permite agregar columnas al final: se conserva
-- el orden de 0019 y se anexan `descripcion` y `google_maps_url` al final.
create or replace view portal_negocios with (security_invoker = true) as
  select id, nombre, pais, slug, logo_url, horarios, timezone,
    coalesce(resena_activa, true) as resena_activa,
    coalesce(recordatorio_activo, true) as recordatorio_activo,
    (coalesce(resena_activa, true) or coalesce(recordatorio_activo, true)) as requiere_email,
    descripcion,
    google_maps_url
  from negocios;

grant select on portal_negocios, portal_staff, portal_servicios to anon, authenticated;
