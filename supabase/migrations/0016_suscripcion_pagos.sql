-- TurnoMas · Historial de pagos de la suscripción SaaS.
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
--
-- Persiste cada cuota mensual del plan (`subscription_authorized_payment`)
-- que confirma el webhook de MercadoPago, para mostrar comprobantes, fechas
-- y montos sin depender de una consulta en vivo a MP.
-- `authorized_payment_id` es la clave de idempotencia (una fila por cuota);
-- `mp_payment_id` es el comprobante real (`payment.id`) que se muestra.
-- Monto en centavos enteros, igual que `turnos.monto_total`.

create table if not exists suscripcion_pagos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  preapproval_id text not null,
  authorized_payment_id text not null,
  mp_payment_id text null,
  monto_cents int not null check (monto_cents >= 0),
  currency text not null,
  estado text not null,
  fecha timestamptz not null,
  created_at timestamptz not null default now()
);

-- Una fila por cuota: el upsert del webhook no duplica cobros repetidos.
create unique index if not exists suscripcion_pagos_authorized_unique
  on suscripcion_pagos (authorized_payment_id);

-- Historial por negocio (más recientes primero).
create index if not exists suscripcion_pagos_por_negocio
  on suscripcion_pagos (negocio_id, fecha desc);

alter table suscripcion_pagos enable row level security;

drop policy if exists "suscripcion_pagos_owner_all" on suscripcion_pagos;
create policy "suscripcion_pagos_owner_all" on suscripcion_pagos
  for all to authenticated
  using (negocio_id in (select id from negocios where duenio_id = (select auth.uid())))
  with check (negocio_id in (select id from negocios where duenio_id = (select auth.uid())));
