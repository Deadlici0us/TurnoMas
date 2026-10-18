import { beforeEach, describe, expect, it, vi } from "vitest";

import { contarResenasPendientes, listarResenas } from "./queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Stub de select().eq().order() que devuelve filas. */
function stubListado(filas: unknown[], error: { message?: string } | null = null): void
{
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: filas, error }),
        }),
      }),
    }),
  } as never);
}

/** Stub de select(head:true).eq().eq() que devuelve un count. */
function stubCount(count: number | null, error: { message?: string } | null = null): void
{
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ count, error }),
        }),
      }),
    }),
  } as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("listarResenas",
() =>
{
  it("debería mapear las reseñas con cliente y servicio",
  async () =>
  {
    stubListado([
      {
        id: "r-1",
        estrellas: 2,
        comentario: "Tardó mucho",
        resuelto: false,
        created_at: "2026-10-18T10:00:00Z",
        cliente: { nombre: "Ana", whatsapp: "+549110000001" },
        turno: { servicio: { nombre: "Corte" } },
      },
    ]);

    const result = await listarResenas("neg-1");

    expect(result).toEqual([{
      id: "r-1",
      estrellas: 2,
      comentario: "Tardó mucho",
      resuelto: false,
      fecha: "2026-10-18T10:00:00Z",
      cliente: "Ana",
      whatsapp: "+549110000001",
      servicio: "Corte",
    }]);
  });

  it("debería usar fallbacks y descartar filas inválidas",
  async () =>
  {
    stubListado([
      { id: "r-1", estrellas: 5, created_at: "2026-10-18T10:00:00Z", cliente: null, turno: null },
      { id: "invalido" },
    ]);

    const result = await listarResenas("neg-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.cliente).toBe("Cliente");
    expect(result[0]?.servicio).toBe("Servicio");
  });

  it("debería devolver vacío sin negocio o ante error",
  async () =>
  {
    expect(await listarResenas("")).toEqual([]);

    mockAdmin.mockImplementation(() =>
    {
      throw new Error("sin base");
    });

    expect(await listarResenas("neg-1")).toEqual([]);
  });
});

describe("contarResenasPendientes",
() =>
{
  it("debería devolver el conteo de pendientes",
  async () =>
  {
    stubCount(3);

    expect(await contarResenasPendientes("neg-1")).toBe(3);
  });

  it("debería devolver 0 sin negocio o conteo nulo",
  async () =>
  {
    expect(await contarResenasPendientes("")).toBe(0);

    stubCount(null);
    expect(await contarResenasPendientes("neg-1")).toBe(0);
  });
});
