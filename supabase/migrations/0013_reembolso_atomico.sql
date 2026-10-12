-- TurnoMas · Cancelación atómica del cliente + auditoría.
-- Aplica sobre 0012: `reembolsos` (source-of-truth, dedup real),
-- `turno_eventos` (auditoría) y `reclamar_reembolso` (claim atómico con
-- FOR UPDATE contra el TOCTOU de doble-cancelación paralela).
-- Solo service_role: sin lectura anónima (nunca turnos/clientes/secretos).

create table if not exists reembolsos (
  turno_id uuid primary key references turnos (id) on delete cascade,
  mp_payment_id text not null,
  idempotency_key text not null unique,
  mp_refund_id text null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'ok', 'fallido')),
  error text null,
  created_at timestamptz not null default now()
);

create table if not exists turno_eventos (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references turnos (id) on delete cascade,
  actor text not null check (actor in ('cliente', 'duenio', 'sistema')),
  accion text not null check (accion in ('cancelacion_solicitada',
    'reembolso_ok', 'reembolso_fallido', 'retenida_por_politica',
    'cancelacion_sin_reembolso')),
  detalle jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists turno_eventos_por_turno on turno_eventos (turno_id, created_at);

alter table reembolsos enable row level security;
alter table turno_eventos enable row level security;

-- Reclama el derecho a reembolsar: solo gana si el turno sigue pagado y
-- sin seña devuelta. Lock de fila: el perdedor paralelo ve ganador=false
-- y no llama a MercadoPago. Idempotente: si ya existe el reclamo ganador,
-- lo devuelve sin duplicar.
create or replace function reclamar_reembolso(p_turno_id uuid, p_mp_payment_id text,
  p_idempotency_key text)
returns table (ganador boolean, estado_turno text)
language plpgsql security definer set search_path = '' as $$
declare
  v_estado text;
  v_reembolsada boolean;
begin
  select t.estado, t.sena_reembolsada into v_estado, v_reembolsada
    from public.turnos t where t.id = p_turno_id for update;

  if not found then
    return query select false, null::text;

    return;
  end if;

  if v_estado <> 'pagado' or v_reembolsada then
    return query select false, v_estado;

    return;
  end if;

  insert into public.reembolsos (turno_id, mp_payment_id, idempotency_key, estado)
    values (p_turno_id, p_mp_payment_id, p_idempotency_key, 'pendiente')
    on conflict (turno_id) do nothing;

  if not found then
    return query select false, v_estado;

    return;
  end if;

  return query select true, v_estado;
end;
$$;
