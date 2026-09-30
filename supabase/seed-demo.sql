-- TurnoMas · Seed de la cuenta Demo permanente (PLAN.md §3).
-- Vía preferida (automática): setear DEMO_DUENIO_ID en Vercel y llamar
-- `curl -X POST https://<app>/api/init` una vez tras el deploy.
-- Vía manual alternativa:
-- Orden: 1) aplicar 0000_init.sql
--        2) Authentication → Add user → demo@turnomas.com / demo123 (auto-confirm)
--        3) copiar el UID del usuario, reemplazar DEMO_DUENIO_ID abajo, Run.
-- Idempotente: re-ejecutable gracias a `on conflict do nothing`.

-- NEGOCIO DEMO --------------------------------------------------------------
insert into negocios (id, duenio_id, nombre, pais, slug, suscripcion_estado, horarios, timezone)
values (
  'd0e6b000-0000-4000-8000-000000000001',
  'DEMO_DUENIO_ID', -- << pegar UID de demo@turnomas.com
  'Barbería Diego',
  'ar',
  'barberia-diego',
  'active',
  '{"lun": ["08:00-22:00"], "mar": ["08:00-22:00"], "mié": ["08:00-22:00"], "jue": ["08:00-22:00"],
    "vie": ["08:00-22:00"], "sáb": ["08:00-20:00"], "dom": []}',
  'America/Argentina/Buenos_Aires'
)
on conflict (id) do nothing;

-- STAFF ---------------------------------------------------------------------
insert into staff (id, negocio_id, nombre, horarios) values
  ('d0e6b000-0000-4000-8000-000000000011',
   'd0e6b000-0000-4000-8000-000000000001', 'Diego',
   '{"lun-vie": "09:00-19:00", "sab": "09:00-14:00"}'),
  ('d0e6b000-0000-4000-8000-000000000012',
   'd0e6b000-0000-4000-8000-000000000001', 'Camila',
   '{"lun-vie": "10:00-20:00"}')
on conflict (id) do nothing;

-- SERVICIOS -----------------------------------------------------------------
insert into servicios
  (id, negocio_id, nombre, duracion_min,
   precio_base, precio_promocional, sena_requerida, sena_porcentaje)
values
  ('d0e6b000-0000-4000-8000-000000000021',
   'd0e6b000-0000-4000-8000-000000000001', 'Corte clásico', 30,
   1500000, null, true, 50),
  ('d0e6b000-0000-4000-8000-000000000022',
   'd0e6b000-0000-4000-8000-000000000001', 'Barba + corte', 45,
   2000000, 1700000, true, 50),
  ('d0e6b000-0000-4000-8000-000000000023',
   'd0e6b000-0000-4000-8000-000000000001', 'Perfilado de barba', 20,
   800000, null, false, 50)
on conflict (id) do nothing;

-- CLIENTES (uno con 2 ausencias → dispara lista negra con umbral 2) ----------
insert into clientes (id, negocio_id, nombre, whatsapp, ausencias) values
  ('d0e6b000-0000-4000-8000-000000000031',
   'd0e6b000-0000-4000-8000-000000000001', 'Juan Pérez', '+549110000001', 0),
  ('d0e6b000-0000-4000-8000-000000000032',
   'd0e6b000-0000-4000-8000-000000000001', 'María Gómez', '+549110000002', 1),
  ('d0e6b000-0000-4000-8000-000000000033',
   'd0e6b000-0000-4000-8000-000000000001', 'Falta Siempre', '+549110000003', 2)
on conflict (id) do nothing;

-- TURNOS de muestra (agenda llena para la demo) -------------------------------
insert into turnos
  (id, negocio_id, staff_id, servicio_id, cliente_id, inicio, estado,
   monto_total, sena_monto, sena_porcentaje)
values
  ('d0e6b000-0000-4000-8000-000000000041',
   'd0e6b000-0000-4000-8000-000000000001',
   'd0e6b000-0000-4000-8000-000000000011',
   'd0e6b000-0000-4000-8000-000000000021',
   'd0e6b000-0000-4000-8000-000000000031',
   date_trunc('hour', now()) + interval '2 hours', 'pagado',
   1500000, 750000, 50),
  ('d0e6b000-0000-4000-8000-000000000042',
   'd0e6b000-0000-4000-8000-000000000001',
   'd0e6b000-0000-4000-8000-000000000011',
   'd0e6b000-0000-4000-8000-000000000022',
   'd0e6b000-0000-4000-8000-000000000032',
   date_trunc('hour', now()) + interval '1 day', 'pendiente',
   2000000, 1000000, 50),
  ('d0e6b000-0000-4000-8000-000000000043',
   'd0e6b000-0000-4000-8000-000000000001',
   'd0e6b000-0000-4000-8000-000000000012',
   'd0e6b000-0000-4000-8000-000000000023',
   'd0e6b000-0000-4000-8000-000000000031',
   date_trunc('hour', now()) - interval '1 day', 'completado',
   800000, null, 50)
on conflict (id) do nothing;
