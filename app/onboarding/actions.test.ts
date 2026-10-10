import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBusiness } from "./actions";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/navigation", () =>
{
  return {
    redirect: (url: string): never =>
    {
      throw new Error(`NEXT_REDIRECT:${url}`);
    },
  };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

const mockServer = vi.mocked(getSupabaseServer);

function formulario(entries: Record<string, string>): FormData
{
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries))
  {
    formData.append(key, value);
  }

  return formData;
}

function formularioValido(): FormData
{
  return formulario({ nombre: "Barbería Diego", pais: "ar", timezone: "America/Argentina/Buenos_Aires" });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("createBusiness",
() =>
{
  it("debería pedir datos válidos",
  async () =>
  {
    await expect(createBusiness(formulario({ nombre: "!!!", pais: "ar", timezone: "" })))
      .rejects.toThrow("NEXT_REDIRECT:/onboarding?error=datos");
  });

  it("debería ir al dashboard en modo demo",
  async () =>
  {
    await expect(createBusiness(formularioValido())).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockServer).not.toHaveBeenCalled();
  });

  it("debería pedir login sin sesión en modo supabase",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(createBusiness(formularioValido()))
      .rejects.toThrow("NEXT_REDIRECT:/login?error=sesion");
  });

  it("debería mandar al dashboard al dueño demo",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    vi.stubEnv("DEMO_DUENIO_ID", "user-demo");
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-demo", email: "x@y.com" } } }) },
    } as never);

    await expect(createBusiness(formularioValido())).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("debería seguir al dashboard con negocio duplicado",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
      from: () => ({
        insert: async () => ({ error: { code: "23505", message: "dup" } }),
      }),
    } as never);

    await expect(createBusiness(formularioValido())).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("debería pedir reintento cuando el guardado falla",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
      from: () => ({
        insert: async () => ({ error: { code: "500", message: "db" } }),
      }),
    } as never);

    await expect(createBusiness(formularioValido()))
      .rejects.toThrow("NEXT_REDIRECT:/onboarding?error=guardado");
  });

  it("debería crear y pedir conectar calendario",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    const insert = vi.fn(async () => ({ error: null }));
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
      from: () => ({ insert }),
    } as never);

    await expect(createBusiness(formularioValido()))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/config?gcal=pending");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      duenio_id: "user-1",
      nombre: "Barbería Diego",
      pais: "ar",
      slug: "barberia-diego",
    }));
  });
});
