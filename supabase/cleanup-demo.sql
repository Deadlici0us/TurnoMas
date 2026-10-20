-- TurnoMas · Limpieza única de la demo legada en Supabase.
--
-- La demo actual vive 100% en memoria (`lib/seed/demo-rows.ts`) y no escribe
-- en la base. Este script elimina cualquier resto del negocio demo que haya
-- quedado de versiones anteriores.
--
-- Ejecutar UNA SOLA VEZ en bases existentes (staging/producción) ANTES de
-- eliminar las migraciones viejas. Una base creada desde cero con
-- `migrations/0000_init.sql` no lo necesita.
--
-- El usuario de Supabase Auth `demo@turnomas.com` se puede borrar aparte
-- desde Authentication; este script no toca `auth.users`.

begin;

-- `turnos` cascadea a reembolsos, turno_eventos y reseñas.
delete from public.turnos
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.staff_servicios
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.clientes
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.servicios
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.staff
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.suscripcion_pagos
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.promociones_suscripcion
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.negocio_secretos
where negocio_id = 'd0e6b000-0000-4000-8000-000000000001';

delete from public.negocios
where id = 'd0e6b000-0000-4000-8000-000000000001';

commit;
