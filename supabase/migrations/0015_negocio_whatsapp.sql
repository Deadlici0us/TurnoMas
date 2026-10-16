-- TurnoMas · Negocio: WhatsApp propio del dueño (plan app-only, sin Meta API).
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
--
-- Guarda la línea que ve el cliente (ej: "+54 9 11 1234-5678"). Es opcional:
-- en la fase app-only el dueño manda con su propia app de WhatsApp.

alter table negocios
  add column if not exists whatsapp text null;

alter table negocios
  drop constraint if exists negocios_whatsapp_largo;

alter table negocios
  add constraint negocios_whatsapp_largo
    check (whatsapp is null or char_length(whatsapp) between 7 and 25);
