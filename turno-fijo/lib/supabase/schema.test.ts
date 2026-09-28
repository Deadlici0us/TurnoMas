import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIGRATION = readFileSync(
  join(REPO_ROOT, "supabase", "migrations", "0000_init.sql"),
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
  });

  it("el seed debería poblar la cuenta demo con agenda llena",
  () =>
  {
    expect(SEED).toContain("barberia-diego");
    expect(SEED).toContain("demo@turnofijo.com");
    expect(SEED).toContain("DEMO_DUENIO_ID");
  });
});
