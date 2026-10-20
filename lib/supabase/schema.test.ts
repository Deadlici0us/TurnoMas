import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0000_init.sql"),
  "utf8",
);
const CLEANUP = readFileSync(
  join(REPO_ROOT, "supabase", "cleanup-demo.sql"),
  "utf8",
);

/**
 * Contrato código ↔ base de datos: lo que `app/onboarding/actions.ts`
 * inserta y lo que el portal público necesita debe existir en la migración.
 */
describe("esquema Supabase",
() =>
{
  it("debería crear todas las tablas del dominio",
  () =>
  {
    for (const tabla of [
      "negocios", "negocio_secretos", "staff", "servicios", "clientes",
      "turnos", "reembolsos", "turno_eventos", "suscripcion_pagos",
      "resenas", "staff_servicios", "promociones_suscripcion",
    ])
    {
      expect(MIGRATION).toMatch(new RegExp(`create table if not exists ${tabla} \\(`));
    }
  });

  it("debería incluir las columnas que inserta el onboarding",
  () =>
  {
    for (const columna of ["duenio_id", "nombre", "pais", "slug"])
    {
      expect(MIGRATION).toContain(columna);
    }

    expect(MIGRATION).toContain("unique (pais, slug)");
  });

  it("debería aislar tokens en tabla sin lectura anónima",
  () =>
  {
    expect(MIGRATION).toContain("negocio_secretos");
    expect(MIGRATION).toContain("mercadopago_access_token");
    expect(MIGRATION).toContain("mercadopago_refresh_token");
    expect(MIGRATION).toContain("meta_access_token");
    expect(MIGRATION).toContain("google_refresh_token");
    expect(MIGRATION).not.toMatch(/grant select on negocio_secretos/);
  });

  it("debería guardar automatizaciones, mensajes y suscripción",
  () =>
  {
    for (const columna of [
      "recordatorio_activo", "recordatorio_hs",
      "resena_activa", "resena_hs",
      "remarketing_activo", "remarketing_dias",
      "msg_confirmacion_subject", "msg_recordatorio_cuerpo",
      "msg_resena_subject", "msg_remarketing_cuerpo",
      "google_maps_url", "suscripcion_mora_desde",
      "suscripcion_vence_en", "suscripcion_cancelada_en",
      "suscripcion_mp_status", "suscripcion_verificada_en",
      "google_place_id", "sena_retencion_hs",
    ])
    {
      expect(MIGRATION).toContain(columna);
    }

    expect(MIGRATION).toMatch(/alter table negocios|create table if not exists negocios/);
    expect(MIGRATION).toMatch(/alter table servicios|create table if not exists servicios/);
  });

  it("debería permitir seña 0% y validar perfiles públicos",
  () =>
  {
    expect(MIGRATION).toContain("servicios_sena_porcentaje_check");
    expect(MIGRATION).toContain("turnos_sena_porcentaje_check");
    expect(MIGRATION).toContain("between 0 and 100");
    expect(MIGRATION).toContain("negocios_descripcion_check");
    expect(MIGRATION).toContain("negocios_whatsapp_largo");
    expect(MIGRATION).toContain("staff_descripcion_check");
    expect(MIGRATION).toContain("clientes_email_check");
  });

  it("debería guardar el estado interno de turnos y clientes",
  () =>
  {
    for (const columna of [
      "resena_pedida", "sena_reembolsada", "sena_reembolsada_at",
      "remarketing_manual_at", "google_calendar_event_id",
      "email", "ausencias", "bloqueado",
    ])
    {
      expect(MIGRATION).toContain(columna);
    }

    expect(MIGRATION).toContain("'confirmado'");
    expect(MIGRATION).toContain("'pagado'");
  });

  it("debería exponer las vistas portal sin secretos para /:pais/:slug",
  () =>
  {
    for (const vista of [
      "portal_negocios", "portal_staff", "portal_servicios", "portal_staff_servicios",
    ])
    {
      expect(MIGRATION).toMatch(new RegExp(`view ${vista} with \\(security_invoker = true\\)`));
    }

    for (const columna of [
      "requiere_email", "descripcion", "google_maps_url", "foto_url",
    ])
    {
      expect(MIGRATION).toContain(columna);
    }

    expect(MIGRATION).toContain(
      "grant select on portal_negocios, portal_staff, portal_servicios, portal_staff_servicios",
    );
  });

  it("debería fijar search_path en funciones y no re-evaluar auth por fila",
  () =>
  {
    expect(MIGRATION).toMatch(/set search_path = ''/);
    expect(MIGRATION).toContain("(select auth.uid())");
    expect(MIGRATION).not.toMatch(/duenio_id = auth\.uid\(\)/);
    expect(MIGRATION).toContain("security definer set search_path = ''");
  });

  it("debería cubrir FKs, crons e índices calientes",
  () =>
  {
    for (const indice of [
      "turnos_mp_payment_id_unique",
      "turnos_por_agenda",
      "turnos_por_staff",
      "turnos_por_servicio",
      "turnos_por_staff_agenda",
      "turnos_por_negocio_estado",
      "turnos_cron_recordatorio",
      "turnos_cron_antifantasma",
      "turnos_cron_resena",
      "turnos_remarketing_manual_idx",
      "turno_eventos_por_turno",
      "suscripcion_pagos_authorized_unique",
      "suscripcion_pagos_por_negocio",
      "negocios_suscripcion_riesgo",
      "resenas_turno_unique",
      "resenas_por_negocio",
      "resenas_pendientes",
      "staff_servicios_por_negocio",
      "staff_servicios_por_servicio",
      "promociones_suscripcion_por_vencer",
    ])
    {
      expect(MIGRATION).toContain(indice);
    }
  });

  it("debería reclamar el reembolso atómico con auditoría (fix TOCTOU)",
  () =>
  {
    expect(MIGRATION).toContain("reclamar_reembolso");
    expect(MIGRATION).toMatch(/for update/i);
    expect(MIGRATION).toContain("idempotency_key");
    expect(MIGRATION).toContain("turno_eventos");
    expect(MIGRATION).not.toMatch(/grant select on reembolsos/);
    expect(MIGRATION).not.toMatch(/grant select on turno_eventos/);
    expect(MIGRATION).not.toMatch(/policy[^;]*to anon[^;]*on (reembolsos|turno_eventos)/);
  });

  it("debería persistir pagos, reseñas y promociones con RLS",
  () =>
  {
    for (const tabla of [
      "suscripcion_pagos", "resenas", "staff_servicios", "promociones_suscripcion",
    ])
    {
      expect(MIGRATION).toContain(`alter table ${tabla} enable row level security;`);
    }

    expect(MIGRATION).toContain("suscripcion_pagos_owner_all");
    expect(MIGRATION).toContain("resenas_owner_all");
    expect(MIGRATION).toContain("staff_servicios_owner_all");
    expect(MIGRATION).toContain("promociones_suscripcion_owner_select");
  });

  it("debería permitir lectura anónima solo del portal público",
  () =>
  {
    for (const policy of [
      "negocios_portal_anon", "staff_portal_anon",
      "servicios_portal_anon", "staff_servicios_portal_anon",
    ])
    {
      expect(MIGRATION).toContain(policy);
    }

    expect(MIGRATION).not.toMatch(/policy[^;]*to anon[^;]*on turnos/);
    expect(MIGRATION).not.toMatch(/policy[^;]*to anon[^;]*on clientes/);
    expect(MIGRATION).not.toMatch(/policy[^;]*to anon[^;]*on negocio_secretos/);
  });

  it("debería crear los buckets de Storage con policies por dueño",
  () =>
  {
    expect(MIGRATION).toContain("'logos', 'logos', true");
    expect(MIGRATION).toContain("'galeria', 'galeria', true");
    expect(MIGRATION).toContain("storage_public_read");
    expect(MIGRATION).toContain("storage_owner_write");
    expect(MIGRATION).toContain("storage_owner_update");
    expect(MIGRATION).toContain("storage_owner_delete");
  });

  it("debería limpiar la demo legada en orden seguro de FKs",
  () =>
  {
    expect(CLEANUP).toContain("delete from public.turnos");
    expect(CLEANUP).toContain("delete from public.staff_servicios");
    expect(CLEANUP).toContain("delete from public.negocios");
    expect(CLEANUP).toContain("d0e6b000-0000-4000-8000-000000000001");
  });
});
