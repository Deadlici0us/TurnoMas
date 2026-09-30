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
    expect(SEED).toContain("barberia-diego");
    expect(SEED).toContain("demo@turnomas.com");
    expect(SEED).toContain("DEMO_DUENIO_ID");
  });
});
