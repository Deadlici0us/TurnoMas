-- TurnoMas · La cuenta demo queda sin suscripción ni integraciones reales.
--
-- La demo ahora se sirve 100% en memoria (cookie `session=demo` + seed), pero
-- esta migración limpia cualquier fila/estado legado para que la DB no guarde
-- un plan activo, pagos, promociones ni tokens del negocio demo.

update negocios
set
  nombre = 'Negocio Demo',
  slug = 'negocio-demo',
  suscripcion_estado = 'trial',
  suscripcion_mp_id = null,
  suscripcion_mora_desde = null,
  suscripcion_vence_en = null,
  suscripcion_cancelada_en = null,
  suscripcion_mp_status = null,
  suscripcion_verificada_en = null
where id = 'd0e6b000-0000-4000-8000-000000000001';

delete from suscripcion_pagos
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from promociones_suscripcion
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

update negocio_secretos
set
  mercadopago_access_token = null,
  mercadopago_refresh_token = null,
  mercadopago_user_id = null,
  mp_conectado_at = null,
  meta_access_token = null,
  whatsapp_phone_number_id = null,
  waba_id = null,
  google_refresh_token = null,
  google_email = null,
  google_conectado_at = null
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';
