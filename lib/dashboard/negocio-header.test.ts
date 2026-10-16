import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServer: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { getNegocioHeader } from "./negocio-header";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Stub del cliente de sesión con (o sin) usuario. */
function stubUser(user: { id: string; email: string } | null): void
{
  mockServer.mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user } }),
    },
  } as never);
}

/** Stub del admin devolviendo (o no) la fila del negocio. */
function stubNegocio(row: Record<string, unknown> | null): void
{
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row }),
        }),
      }),
    }),
  } as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
  stubUser(null);
  stubNegocio(null);
});

describe("getNegocioHeader",
() =>
{
  it("debería devolver el negocio demo sin usuario Supabase",
  async () =>
  {
    mockServer.mockRejectedValueOnce(new Error("sin configurar"));

    await expect(getNegocioHeader()).resolves.toEqual({
      nombre: "Barbería Diego",
      logoUrl: null,
    });
  });

  it("debería devolver el negocio demo para el dueño demo",
  async () =>
  {
    stubUser({ id: "u-demo", email: "demo@turnomas.com" });

    const result = await getNegocioHeader();

    expect(result?.nombre).toBe("Barbería Diego");
    expect(result?.logoUrl).toBeNull();
  });

  it("debería devolver nombre y logo del negocio real",
  async () =>
  {
    stubUser({ id: "u-1", email: "a@b.com" });
    stubNegocio({ nombre: "Peluquería Sur", logo_url: "https://cdn/x.png" });

    await expect(getNegocioHeader()).resolves.toEqual({
      nombre: "Peluquería Sur",
      logoUrl: "https://cdn/x.png",
    });
  });

  it("debería dejar logo nulo si viene vacío",
  async () =>
  {
    stubUser({ id: "u-1", email: "a@b.com" });
    stubNegocio({ nombre: "Peluquería Sur", logo_url: "   " });

    const result = await getNegocioHeader();

    expect(result?.logoUrl).toBeNull();
  });

  it("debería ser nulo sin negocio",
  async () =>
  {
    stubUser({ id: "u-2", email: "a@b.com" });
    stubNegocio(null);

    await expect(getNegocioHeader()).resolves.toBeNull();
  });

  it("no debería romper si el admin no está configurado",
  async () =>
  {
    stubUser({ id: "u-3", email: "a@b.com" });
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("Falta configurar Supabase en el entorno (URL y clave de servicio).");
    });

    await expect(getNegocioHeader()).resolves.toBeNull();
  });
});
