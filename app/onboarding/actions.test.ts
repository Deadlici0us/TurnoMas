import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBusiness, saveBusinessWhatsapp } from "./actions";
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

/**
 * Stub de Supabase para el update del WhatsApp del negocio.
 *
 * @param error Error devuelto por Supabase, o null si guarda bien.
 * @return Funciones espía para verificar la actualización.
 */
function stubWhatsappUpdate(error: { code: string; message: string } | null = null): {
  readonly update: ReturnType<typeof vi.fn>;
  readonly eq: ReturnType<typeof vi.fn>;
}
{
  const eq = vi.fn(async () => ({ error }));
  const update = vi.fn(() => ({ eq }));

  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
    from: () => ({ update }),
  } as never);

  return { update, eq };
}

function formularioWhatsapp(whatsapp: string): FormData
{
  return formulario({ whatsapp });
}

describe("saveBusinessWhatsapp",
() =>
{
  it("debería ir al dashboard en modo demo",
  async () =>
  {
    await expect(saveBusinessWhatsapp(formularioWhatsapp("+54 9 11 1234-5678")))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard");
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

    await expect(saveBusinessWhatsapp(formularioWhatsapp("+54 9 11 1234-5678")))
      .rejects.toThrow("NEXT_REDIRECT:/login?error=sesion");
  });

  it("debería mandar al dashboard al dueño demo",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    vi.stubEnv("DEMO_DUENIO_ID", "user-1");
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
    } as never);

    await expect(saveBusinessWhatsapp(formularioWhatsapp("+54 9 11 1234-5678")))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("debería guardar el WhatsApp recortado y seguir al paso 4",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    const { update, eq } = stubWhatsappUpdate();

    await expect(saveBusinessWhatsapp(formularioWhatsapp("  +54 9 11 1234-5678  ")))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(update).toHaveBeenCalledWith({ whatsapp: "+54 9 11 1234-5678" });
    expect(eq).toHaveBeenCalledWith("duenio_id", "user-1");
  });

  it("debería rechazar un WhatsApp vacío sin tocar la base",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    const { update } = stubWhatsappUpdate();

    await expect(saveBusinessWhatsapp(formularioWhatsapp("   ")))
      .rejects.toThrow("NEXT_REDIRECT:/onboarding?paso=3&error=whatsapp");

    expect(update).not.toHaveBeenCalled();
  });

  it("debería rechazar un WhatsApp inválido",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    const { update } = stubWhatsappUpdate();

    await expect(saveBusinessWhatsapp(formularioWhatsapp("123")))
      .rejects.toThrow("NEXT_REDIRECT:/onboarding?paso=3&error=whatsapp");

    expect(update).not.toHaveBeenCalled();
  });

  it("debería pedir reintento cuando el guardado falla",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    stubWhatsappUpdate({ code: "500", message: "db" });

    await expect(saveBusinessWhatsapp(formularioWhatsapp("+54 9 11 1234-5678")))
      .rejects.toThrow("NEXT_REDIRECT:/onboarding?paso=3&error=guardado");
  });
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

  it("debería persistir los horarios del editor visual",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    const insert = vi.fn(async () => ({ error: null }));
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
      from: () => ({ insert }),
    } as never);

    const form = formularioValido();

    form.append("lun", "09:00-13:00, 15:00-20:00");
    form.append("mar", "");
    form.append("mié", "");
    form.append("jue", "");
    form.append("vie", "");
    form.append("sáb", "");
    form.append("dom", "");

    await expect(createBusiness(form)).rejects.toThrow("NEXT_REDIRECT:/onboarding?paso=2");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      horarios: expect.objectContaining({ lun: ["09:00-13:00", "15:00-20:00"], dom: [] }),
    }));
  });

  it("debería pedir corrección con horarios inválidos",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
      from: () => ({ insert: vi.fn(async () => ({ error: null })) }),
    } as never);

    const form = formularioValido();

    form.append("lun", "19:00-09:00");

    await expect(createBusiness(form)).rejects.toThrow("NEXT_REDIRECT:/onboarding?error=horarios");
  });

  it("debería crear y seguir al paso 2 (conectar MercadoPago)",
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
      .rejects.toThrow("NEXT_REDIRECT:/onboarding?paso=2");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      duenio_id: "user-1",
      nombre: "Barbería Diego",
      pais: "ar",
      slug: "barberia-diego",
    }));
  });
});
