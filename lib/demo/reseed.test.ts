import { beforeEach, describe, expect, it, vi } from "vitest";

import { reseedDemoBusiness } from "./reseed";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);

/**
 * Stub del admin para el reseed.
 *
 * @param negocio Fila del negocio demo o null.
 * @param insertError Error de inserts o null.
 * @param auditor Tablas borradas e inserts capturados.
 */
function stubReseed(
  negocio: unknown,
  insertError: { message: string } | null = null,
  auditor: { deletes?: string[]; inserts?: string[]; updates?: unknown[] } = {},
  failTables?: string[],
)
{
  const admin = {
    from: vi.fn((tabla: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: async () => ({ data: tabla === "negocios" ? negocio : null }),
        })),
      })),
      delete: vi.fn(() =>
      {
        auditor.deletes?.push(tabla);

        return { eq: vi.fn(async () => ({ error: null })) };
      }),
      insert: vi.fn((filas: unknown[]) =>
      {
        auditor.inserts?.push(`${tabla}:${Array.isArray(filas) ? filas.length : 0}`);
        const error = failTables === undefined ? insertError : (failTables.includes(tabla) ? insertError : null);

        return Promise.resolve({ error });
      }),
      update: vi.fn((values: unknown) =>
      {
        auditor.updates?.push(values);

        return { eq: vi.fn(async () => ({ error: null })) };
      }),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("reseedDemoBusiness",
() =>
{
  it("debería rechazar dueño vacío",
  async () =>
  {
    await expect(reseedDemoBusiness("   ")).rejects.toThrow("Falta el dueño demo para restablecer.");
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("debería exigir el negocio demo",
  async () =>
  {
    stubReseed(null);

    await expect(reseedDemoBusiness("duenio-1")).rejects.toThrow("No encontramos el negocio demo.");
  });

  it("debería borrar hijos y reinsertar el seed en orden",
  async () =>
  {
    const auditor: { deletes?: string[]; inserts?: string[] } = { deletes: [], inserts: [] };
    stubReseed({ id: "neg-demo" }, null, auditor);

    const negocioId = await reseedDemoBusiness("duenio-1");

    expect(negocioId).toBe("neg-demo");
    expect(auditor.deletes).toEqual(["turnos", "clientes", "servicios", "staff"]);
    expect(auditor.inserts?.[0]?.startsWith("staff:")).toBe(true);
    expect(auditor.inserts?.[4]?.startsWith("turnos:")).toBe(true);
  });

  it("debería lanzar cuando un insert de hijos falla",
  async () =>
  {
    stubReseed({ id: "neg-demo" }, { message: "fk" });

    await expect(reseedDemoBusiness("duenio-1"))
      .rejects.toThrow("No pudimos restablecer la demo. Probá de nuevo.");
  });

  it("debería lanzar cuando el insert de turnos falla",
  async () =>
  {
    stubReseed({ id: "neg-demo" }, { message: "fk" }, {}, ["turnos"]);

    await expect(reseedDemoBusiness("duenio-1"))
      .rejects.toThrow("No pudimos restablecer la demo. Probá de nuevo.");
  });

  it("debería nullificar todos los secretos del negocio demo",
  async () =>
  {
    const auditor: { deletes?: string[]; inserts?: string[]; updates?: unknown[] } =
      { deletes: [], inserts: [], updates: [] };
    stubReseed({ id: "neg-demo" }, null, auditor);

    await reseedDemoBusiness("duenio-1");

    expect(auditor.updates).toHaveLength(1);
    expect(auditor.updates?.[0]).toMatchObject({
      mercadopago_access_token: null,
      mercadopago_refresh_token: null,
      mercadopago_user_id: null,
      mp_conectado_at: null,
      meta_access_token: null,
      whatsapp_phone_number_id: null,
      waba_id: null,
      google_refresh_token: null,
    });
  });
});

describe("reseedDemoBusiness integración",
() =>
{
  it("debería resetear punta a punta con seed real",
  async () =>
  {
    const auditor: { deletes?: string[]; inserts?: string[] } = { deletes: [], inserts: [] };
    stubReseed({ id: "neg-demo" }, null, auditor);

    await reseedDemoBusiness("  duenio-1  ");

    expect(auditor.deletes).toHaveLength(4);
    expect(auditor.inserts).toHaveLength(5);
  });
});
