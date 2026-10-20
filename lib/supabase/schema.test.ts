import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0000_init.sql"),
  "utf8",
);
const SENA_CERO = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0003_sena_cero.sql"),
  "utf8",
);
const NEGOCIO_HORARIOS = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0004_negocio_horarios.sql"),
  "utf8",
);
const NEGOCIO_TIMEZONE = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0005_negocio_timezone.sql"),
  "utf8",
);
const AUTOMATIZACIONES = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0007_automatizaciones.sql"),
  "utf8",
);
const MP_OAUTH = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0008_mp_oauth.sql"),
  "utf8",
);
const SUSCRIPCION_MORA = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0009_suscripcion_mora.sql"),
  "utf8",
);
const PORTAL_VIEWS = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0010_portal_views.sql"),
  "utf8",
);
const PORTAL_ANON = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0011_portal_anon.sql"),
  "utf8",
);
const REEMBOLSO_IDEMPOTENTE = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0012_reembolso_idempotente.sql"),
  "utf8",
);
const REEMBOLSO_ATOMICO = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0013_reembolso_atomico.sql"),
  "utf8",
);
const SUSCRIPCION_PAGOS = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0016_suscripcion_pagos.sql"),
  "utf8",
);
const SUSCRIPCION_RECONCILIACION = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0018_suscripcion_reconciliacion.sql"),
  "utf8",
);
const RESENAS = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0019_resenas.sql"),
  "utf8",
);
const STAFF_PERFIL_SERVICIOS = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0020_staff_perfil_servicios.sql"),
  "utf8",
);
const PERFIL_PUBLICO = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0021_negocio_perfil_publico.sql"),
  "utf8",
);
const SEED = readFileSync(join(REPO_ROOT, "supabase", "seed-demo.sql"), "utf8");

/**
 * Contrato código ↔ base de datos: lo que `app/onboarding/actions.ts`
 * inserta y lo que el portal público necesita debe existir en la migración.
 */
describe("esquema Supabase",
() =>
{
  it("debería crear las cinco entidades del PLAN.md §3",
  () =>
  {
    for (const tabla of ["negocios", "staff", "servicios", "clientes", "turnos"])
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
    expect(MIGRATION).toContain("meta_access_token");
    expect(MIGRATION).not.toMatch(/grant select on negocio_secretos/);
  });

  it("debería exponer vistas portal sin secretos para /:pais/:slug",
  () =>
  {
    for (const vista of ["portal_negocios", "portal_staff", "portal_servicios"])
    {
      expect(MIGRATION).toContain(vista);
    }

    // Linter Supabase: vistas con SECURITY INVOKER, no DEFINER.
    expect(MIGRATION).toMatch(/portal_negocios with \(security_invoker = true\)/);
    expect(MIGRATION).toMatch(/portal_staff with \(security_invoker = true\)/);
    expect(MIGRATION).toMatch(/portal_servicios with \(security_invoker = true\)/);
  });

  it("debería separar confirmado (sin seña) de pagado (seña cobrada)",
  () =>
  {
    expect(MIGRATION).toContain("'confirmado'");
  });

  it("debería permitir seña 0% en servicios y turnos",
  () =>
  {
    expect(SENA_CERO).toContain("between 0 and 100");
    expect(SENA_CERO).toContain("servicios_sena_porcentaje_check");
    expect(SENA_CERO).toContain("turnos_sena_porcentaje_check");
  });

  it("debería guardar los horarios del negocio y exponerlos en el portal",
  () =>
  {
    expect(NEGOCIO_HORARIOS).toContain("horarios");
    expect(NEGOCIO_HORARIOS).toMatch(/alter table negocios add column/i);
    expect(NEGOCIO_HORARIOS).toContain("portal_negocios");
  });

  it("debería guardar la zona horaria por negocio (no por país) y exponerla en el portal",
  () =>
  {
    expect(NEGOCIO_TIMEZONE).toMatch(/alter table negocios add column/i);
    expect(NEGOCIO_TIMEZONE).toContain("timezone");
    expect(NEGOCIO_TIMEZONE).toContain("portal_negocios");
    expect(NEGOCIO_TIMEZONE).toContain("America/Mexico_City");
    expect(NEGOCIO_TIMEZONE).toContain("lower(pais)");
  });

  it("debería fijar search_path en funciones y no re-evaluar auth por fila",
  () =>
  {
    expect(MIGRATION).toMatch(/set search_path = ''/);
    expect(MIGRATION).toContain("(select auth.uid())");
    expect(MIGRATION).not.toMatch(/duenio_id = auth\.uid\(\)/);
  });

  it("debería cubrir FKs e índices calientes",
  () =>
  {
    for (const indice of [
      "turnos_por_staff",
      "turnos_por_servicio",
      "turnos_por_staff_agenda",
      "turnos_por_negocio_estado",
      "turnos_mp_payment_id_unique",
    ])
    {
      expect(MIGRATION).toContain(indice);
    }
  });

  it("debería usar un solo calendario por negocio (sin token por profesional)",
  () =>
  {
    expect(MIGRATION).not.toContain("google_calendar_token");
  });

  it("el seed debería poblar la cuenta demo con agenda llena",
  () =>
  {
    expect(SEED).toContain("negocio-demo");
    expect(SEED).toContain("demo@turnomas.com");
    expect(SEED).toContain("DEMO_DUENIO_ID");
  });

  it("debería guardar automatizaciones y mensajes configurables por negocio",
  () =>
  {
    for (const columna of [
      "recordatorio_activo", "recordatorio_hs",
      "resena_activa", "resena_hs",
      "remarketing_activo", "remarketing_dias",
      "msg_confirmacion_subject", "msg_recordatorio_cuerpo",
      "msg_resena_subject", "msg_remarketing_cuerpo",
      "google_maps_url",
    ])
    {
      expect(AUTOMATIZACIONES).toContain(columna);
    }

    expect(AUTOMATIZACIONES).toContain("remarketing_dias");
    expect(AUTOMATIZACIONES).toMatch(/alter table servicios add column/i);
  });

  it("debería guardar el refresh de OAuth de MercadoPago por negocio",
  () =>
  {
    for (const columna of [
      "mercadopago_refresh_token",
      "mercadopago_user_id",
      "mp_conectado_at",
    ])
    {
      expect(MP_OAUTH).toContain(columna);
    }

    expect(MP_OAUTH).toMatch(/alter table negocio_secretos add column/i);
  });

  it("debería guardar el inicio de mora de la suscripción",
  () =>
  {
    expect(SUSCRIPCION_MORA).toContain("suscripcion_mora_desde");
    expect(SUSCRIPCION_MORA).toMatch(/alter table negocios add column/i);
  });

  it("debería consolidar las vistas del portal con horarios y timezone",
  () =>
  {
    expect(PORTAL_VIEWS).toContain("horarios");
    expect(PORTAL_VIEWS).toContain("timezone");
    expect(PORTAL_VIEWS).toContain("portal_negocios");
    expect(PORTAL_VIEWS).toContain("portal_staff");
    expect(PORTAL_VIEWS).toContain("portal_servicios");
    expect(PORTAL_VIEWS).toMatch(/security_invoker = true/);
    expect(PORTAL_VIEWS).toMatch(/grant select on portal_negocios, portal_staff, portal_servicios/);
  });

  it("debería exponer logo, descripción y ubicación en el portal público",
  () =>
  {
    expect(PERFIL_PUBLICO).toContain("descripcion");
    expect(PERFIL_PUBLICO).toMatch(/alter table negocios add column if not exists descripcion/i);
    expect(PERFIL_PUBLICO).toContain("negocios_descripcion_check");
    expect(PERFIL_PUBLICO).toContain("google_maps_url");
    expect(PERFIL_PUBLICO).toContain("portal_negocios");
    expect(PERFIL_PUBLICO).toMatch(/security_invoker = true/);
    expect(PERFIL_PUBLICO).toMatch(/grant select on portal_negocios, portal_staff, portal_servicios/);
  });

  it("debería permitir lectura anónima del portal (negocios/staff/servicios activos)",
  () =>
  {
    expect(PORTAL_ANON).toMatch(/create policy/i);
    expect(PORTAL_ANON).toMatch(/for select/i);
    expect(PORTAL_ANON).toMatch(/to anon/);
    expect(PORTAL_ANON).toContain("negocios_portal_anon");
    expect(PORTAL_ANON).toContain("staff_portal_anon");
    expect(PORTAL_ANON).toContain("servicios_portal_anon");
    expect(PORTAL_ANON).not.toMatch(/grant select on negocio_secretos/);
    expect(PORTAL_ANON).not.toMatch(/policy[^;]*on turnos/);
    expect(PORTAL_ANON).not.toMatch(/policy[^;]*on clientes/);
    expect(PORTAL_ANON).not.toMatch(/policy[^;]*on negocio_secretos/);
  });

  it("debería marcar la seña reembolsada para reembolso idempotente",
  () =>
  {
    expect(REEMBOLSO_IDEMPOTENTE).toContain("sena_reembolsada");
    expect(REEMBOLSO_IDEMPOTENTE).toContain("sena_reembolsada_at");
    expect(REEMBOLSO_IDEMPOTENTE).toMatch(/alter table turnos add column/i);
  });

  it("debería reclamar el reembolso atómico con auditoría (fix TOCTOU)",
  () =>
  {
    expect(REEMBOLSO_ATOMICO).toContain("reembolsos");
    expect(REEMBOLSO_ATOMICO).toContain("turno_eventos");
    expect(REEMBOLSO_ATOMICO).toContain("reclamar_reembolso");
    expect(REEMBOLSO_ATOMICO).toMatch(/for update/i);
    expect(REEMBOLSO_ATOMICO).toContain("idempotency_key");
    expect(REEMBOLSO_ATOMICO).not.toMatch(/grant select on reembolsos/);
    expect(REEMBOLSO_ATOMICO).not.toMatch(/grant select on turno_eventos/);
    expect(REEMBOLSO_ATOMICO).not.toMatch(/policy[^;]*to anon/);
  });

  it("debería persistir el historial de pagos de la suscripción",
  () =>
  {
    expect(SUSCRIPCION_PAGOS).toMatch(/create table if not exists suscripcion_pagos/i);

    for (const columna of ["negocio_id", "preapproval_id", "authorized_payment_id",
      "mp_payment_id", "monto_cents", "currency", "estado", "fecha"])
    {
      expect(SUSCRIPCION_PAGOS).toContain(columna);
    }

    expect(SUSCRIPCION_PAGOS).toMatch(/references negocios \(id\) on delete cascade/);
    expect(SUSCRIPCION_PAGOS).toMatch(/unique index[^;]*authorized_payment_id/i);
    expect(SUSCRIPCION_PAGOS).toMatch(/enable row level security/);
    expect(SUSCRIPCION_PAGOS).toContain("suscripcion_pagos_owner_all");
    expect(SUSCRIPCION_PAGOS).not.toMatch(/policy[^;]*to anon/);
  });

  it("debería espejar el estado de MP y permitir reconciliación dirigida",
  () =>
  {
    expect(SUSCRIPCION_RECONCILIACION).toContain("suscripcion_mp_status");
    expect(SUSCRIPCION_RECONCILIACION).toContain("suscripcion_verificada_en");
    expect(SUSCRIPCION_RECONCILIACION).toMatch(/alter table negocios add column/i);
    expect(SUSCRIPCION_RECONCILIACION).toContain("negocios_suscripcion_riesgo");
    expect(SUSCRIPCION_RECONCILIACION).toMatch(/create index if not exists/i);
  });

  it("debería guardar foto, descripción y servicios que brinda el equipo",
  () =>
  {
    expect(STAFF_PERFIL_SERVICIOS).toMatch(/alter table staff add column if not exists foto_url/i);
    expect(STAFF_PERFIL_SERVICIOS).toMatch(/alter table staff add column if not exists descripcion/i);
    expect(STAFF_PERFIL_SERVICIOS).toMatch(/create table if not exists staff_servicios/i);

    for (const columna of ["staff_id", "servicio_id", "negocio_id"])
    {
      expect(STAFF_PERFIL_SERVICIOS).toContain(columna);
    }

    expect(STAFF_PERFIL_SERVICIOS).toMatch(/primary key \(staff_id, servicio_id\)/);
    expect(STAFF_PERFIL_SERVICIOS).toMatch(/enable row level security/);
    expect(STAFF_PERFIL_SERVICIOS).toContain("staff_servicios_owner_all");
    expect(STAFF_PERFIL_SERVICIOS).toContain("staff_servicios_portal_anon");
    expect(STAFF_PERFIL_SERVICIOS).toMatch(/portal_staff with \(security_invoker = true\)/);
    expect(STAFF_PERFIL_SERVICIOS).toMatch(/portal_staff_servicios with \(security_invoker = true\)/);
    expect(STAFF_PERFIL_SERVICIOS).toMatch(/grant select on portal_staff, portal_staff_servicios/);
  });

  it("debería sembrar los servicios de cada profesional demo",
  () =>
  {
    expect(SEED).toContain("staff_servicios");
    expect(SEED).toContain("descripcion");
  });

  it("debería persistir las reseñas y el place ID de Google",
  () =>
  {
    expect(RESENAS).toMatch(/create table if not exists resenas/i);

    for (const columna of ["negocio_id", "turno_id", "cliente_id", "estrellas",
      "comentario", "destino", "resuelto", "created_at"])
    {
      expect(RESENAS).toContain(columna);
    }

    expect(RESENAS).toMatch(/unique index[^;]*turno_id/i);
    expect(RESENAS).toMatch(/enable row level security/);
    expect(RESENAS).toContain("resenas_owner_all");
    expect(RESENAS).not.toMatch(/policy[^;]*to anon/);
    expect(RESENAS).toContain("google_place_id");
    expect(RESENAS).toContain("requiere_email");
    expect(RESENAS).toMatch(/security_invoker = true/);
  });
});
