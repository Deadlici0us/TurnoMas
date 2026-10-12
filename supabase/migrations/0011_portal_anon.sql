-- TurnoMas · Lectura anónima del portal (fix 404 en /:pais/:slug).
-- Las vistas `portal_*` usan SECURITY INVOKER: heredan el RLS del
-- consultante. Sin policies para `anon`, el visitante sin sesión ve
-- cero filas aunque el negocio exista (las policies `*_owner_all` solo
-- cubren a `authenticated`). Estas policies exponen solo lo público:
-- negocios (sin secretos), staff y servicios activos. Nunca turnos,
-- clientes ni negocio_secretos.
-- Idempotente: `drop policy if exists` antes de crear.

drop policy if exists "negocios_portal_anon" on negocios;
create policy "negocios_portal_anon" on negocios
  for select to anon
  using (true);

drop policy if exists "staff_portal_anon" on staff;
create policy "staff_portal_anon" on staff
  for select to anon
  using (activo = true);

drop policy if exists "servicios_portal_anon" on servicios;
create policy "servicios_portal_anon" on servicios
  for select to anon
  using (activo = true);
