import { beforeEach, describe, expect, it, vi } from "vitest";

import
{
  actualizarGoogleMapsUrl,
  actualizarHorariosNegocio,
  actualizarNombreNegocio,
  actualizarPlantillaMensaje,
  actualizarPoliticaListaNegra,
  actualizarPoliticaRecordatorios,
  actualizarPoliticaRemarketing,
  actualizarPoliticaResenas,
  actualizarPoliticaSena,
  actualizarTimezoneNegocio,
  actualizarWhatsappNegocio,
} from "./actions";
import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
});

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertModoEditable: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

vi.mock("@/lib/dashboard/negocio", () =>
{
  return { getNegocioIdDelDueno: vi.fn() };
});

const mockRevalidate = vi.mocked(revalidatePath);
const mockAssert = vi.mocked(assertModoEditable);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockNegocio = vi.mocked(getNegocioIdDelDueno);

/** Sesión de dueño autenticado con negocio resuelto. */
function sesionDueno(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
  mockNegocio.mockResolvedValue("neg-1");
}

/** Sesión sin usuario autenticado. */
function sesionAnonima(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as never);
}

/**
 * Stub del admin para las políticas de configuración.
 *
 * @param error Error de escritura o null.
 * @param negocio Fila para `exigirNegocioDelDueno`.
 * @param updates Valores capturados por update().
 */
function stubConfig(
  error: { message?: string } | null = null,
  negocio: unknown = { id: "neg-1", resena_activa: true },
  updates: unknown[] = [],
)
{
  const oneEq = {
    eq: vi.fn(() => ({
      single: async () => ({ data: negocio }),
    })),
    single: async () => ({ data: negocio }),
  };
  const admin = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => oneEq), single: async () => ({ data: negocio }) })),
      update: vi.fn((values: unknown) =>
      {
        updates.push(values);

        return { eq: vi.fn(async () => ({ error })) };
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

describe("actualizarPoliticaListaNegra",
() =>
{
  it("debería guardar umbral y penalidad",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarPoliticaListaNegra(3, "blocked");

    expect(updates).toEqual([{ blacklist_umbral: 3, blacklist_penalidad: "blocked" }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/config");
  });

  it("debería rechazar umbrales fuera de 1-10",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarPoliticaListaNegra(0, "blocked")).rejects.toThrow(RangeError);
    await expect(actualizarPoliticaListaNegra(11, "blocked")).rejects.toThrow(RangeError);
    await expect(actualizarPoliticaListaNegra(1.5, "blocked")).rejects.toThrow(RangeError);
  });

  it("debería rechazar penalidades desconocidas",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarPoliticaListaNegra(3, "ban" as never)).rejects.toThrow("Esa penalidad no existe.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarPoliticaListaNegra(3, "blocked"))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la configuración.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarPoliticaListaNegra(3, "blocked"))
      .rejects.toThrow("No pudimos guardar la configuración. Probá de nuevo.");
  });
});

describe("actualizarPoliticaSena",
() =>
{
  it("debería guardar la retención en horas",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarPoliticaSena(48);

    expect(updates).toEqual([{ sena_retencion_hs: 48 }]);
  });

  it("debería rechazar retenciones fuera de rango",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarPoliticaSena(0)).rejects.toThrow(RangeError);
    await expect(actualizarPoliticaSena(721)).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarPoliticaSena(48))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la configuración.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarPoliticaSena(48))
      .rejects.toThrow("No pudimos guardar la configuración. Probá de nuevo.");
  });
});

describe("actualizarPoliticaRecordatorios",
() =>
{
  it("debería guardar toggle y ventana",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarPoliticaRecordatorios(true, 24);

    expect(updates).toEqual([{ recordatorio_activo: true, recordatorio_hs: 24 }]);
  });

  it("debería rechazar ventanas fuera de 1-72hs",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarPoliticaRecordatorios(true, 0)).rejects.toThrow(RangeError);
    await expect(actualizarPoliticaRecordatorios(true, 73)).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarPoliticaRecordatorios(true, 24))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la configuración.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarPoliticaRecordatorios(true, 24))
      .rejects.toThrow("No pudimos guardar la configuración. Probá de nuevo.");
  });
});

describe("actualizarPoliticaResenas",
() =>
{
  it("debería guardar toggle y demora",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarPoliticaResenas(true, 5);

    expect(updates).toEqual([{ resena_activa: true, resena_hs: 5 }]);
  });

  it("debería rechazar demoras fuera de rango",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarPoliticaResenas(true, 0)).rejects.toThrow(RangeError);
    await expect(actualizarPoliticaResenas(true, 100)).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarPoliticaResenas(true, 5))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la configuración.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarPoliticaResenas(true, 5))
      .rejects.toThrow("No pudimos guardar la configuración. Probá de nuevo.");
  });
});

describe("actualizarPoliticaRemarketing",
() =>
{
  it("debería guardar toggle y días",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarPoliticaRemarketing(true, 30);

    expect(updates).toEqual([{ remarketing_activo: true, remarketing_dias: 30 }]);
  });

  it("debería rechazar días fuera de 1-90",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarPoliticaRemarketing(true, 0)).rejects.toThrow(RangeError);
    await expect(actualizarPoliticaRemarketing(true, 91)).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarPoliticaRemarketing(true, 30))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la configuración.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarPoliticaRemarketing(true, 30))
      .rejects.toThrow("No pudimos guardar la configuración. Probá de nuevo.");
  });
});

describe("actualizarPlantillaMensaje",
() =>
{
  it("debería guardar subject y cuerpo normalizados",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarPlantillaMensaje("confirmacion", "  Hola  ", null);

    expect(updates).toEqual([{
      msg_confirmacion_subject: "Hola",
      msg_confirmacion_cuerpo: null,
    }]);
  });

  it("debería rechazar tipos inexistentes",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarPlantillaMensaje("spam" as never, "x", "y"))
      .rejects.toThrow("Ese tipo de mensaje no existe.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarPlantillaMensaje("confirmacion", "x", "y"))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la configuración.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarPlantillaMensaje("confirmacion", "x", "y"))
      .rejects.toThrow("No pudimos guardar la configuración. Probá de nuevo.");
  });
});

describe("actualizarGoogleMapsUrl",
() =>
{
  it("debería guardar el link con reseñas activas",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarGoogleMapsUrl("https://www.google.com/maps/place/Barberia");

    expect(updates).toEqual([{ google_maps_url: "https://www.google.com/maps/place/Barberia" }]);
  });

  it("debería limpiar el link con null",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarGoogleMapsUrl(null);

    expect(updates).toEqual([{ google_maps_url: null }]);
  });

  it("debería rechazar links que no son de Google Maps",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarGoogleMapsUrl("https://ejemplo.com/mapa")).rejects.toThrow(RangeError);
  });

  it("debería exigir reseñas activas para guardar el link",
  async () =>
  {
    sesionDueno();
    stubConfig(null, { id: "neg-1", resena_activa: false });

    await expect(actualizarGoogleMapsUrl("https://www.google.com/maps/place/X"))
      .rejects.toThrow("Activá las reseñas para guardar el link de Google Maps.");
  });

  it("debería exigir negocio del dueño",
  async () =>
  {
    sesionDueno();
    stubConfig(null, null);

    await expect(actualizarGoogleMapsUrl("https://www.google.com/maps/place/X"))
      .rejects.toThrow("No encontramos tu negocio.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarGoogleMapsUrl("https://www.google.com/maps/place/X"))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la configuración.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarGoogleMapsUrl("https://www.google.com/maps/place/X"))
      .rejects.toThrow("No pudimos guardar la configuración. Probá de nuevo.");
  });
});

describe("actualizarHorariosNegocio",
() =>
{
  it("debería guardar las franjas normalizadas",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarHorariosNegocio({ lun: "09:00-19:00" });

    expect(updates[0]).toMatchObject({ horarios: expect.objectContaining({ lun: ["09:00-19:00"] }) });
  });

  it("debería rechazar horarios inválidos",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarHorariosNegocio("siempre")).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarHorariosNegocio({ lun: "09:00-19:00" }))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar los horarios.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarHorariosNegocio({ lun: "09:00-19:00" }))
      .rejects.toThrow("No pudimos guardar los horarios. Probá de nuevo.");
  });
});

describe("actualizarTimezoneNegocio",
() =>
{
  it("debería guardar la zona y revalidar agenda",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarTimezoneNegocio("America/Mexico_City");

    expect(updates).toEqual([{ timezone: "America/Mexico_City" }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/agenda");
  });

  it("debería rechazar zonas inválidas",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarTimezoneNegocio("Planeta/Tierra")).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarTimezoneNegocio("America/Mexico_City"))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar la zona horaria.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarTimezoneNegocio("America/Mexico_City"))
      .rejects.toThrow("No pudimos guardar la zona horaria. Probá de nuevo.");
  });
});

describe("actualizarNombreNegocio",
() =>
{
  it("debería guardar el nombre recortado",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarNombreNegocio("  Barbería Diego  ");

    expect(updates).toEqual([{ nombre: "Barbería Diego" }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
  });

  it("debería rechazar nombres inválidos",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarNombreNegocio("x")).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarNombreNegocio("Barbería"))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar el nombre.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarNombreNegocio("Barbería"))
      .rejects.toThrow("No pudimos guardar el nombre. Probá de nuevo.");
  });
});

describe("actualizarWhatsappNegocio",
() =>
{
  it("debería guardar el WhatsApp recortado",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarWhatsappNegocio("  +54 9 11 1234-5678  ");

    expect(updates).toEqual([{ whatsapp: "+54 9 11 1234-5678" }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/config");
  });

  it("debería guardar null cuando queda vacío",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubConfig(null, undefined, updates);

    await actualizarWhatsappNegocio("   ");

    expect(updates).toEqual([{ whatsapp: null }]);
  });

  it("debería rechazar números inválidos",
  async () =>
  {
    sesionDueno();
    stubConfig();

    await expect(actualizarWhatsappNegocio("123")).rejects.toThrow(RangeError);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sesionAnonima();
    stubConfig();

    await expect(actualizarWhatsappNegocio("+54 9 11 1234-5678"))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar el WhatsApp.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubConfig({});

    await expect(actualizarWhatsappNegocio("+54 9 11 1234-5678"))
      .rejects.toThrow("No pudimos guardar el WhatsApp. Probá de nuevo.");
  });
});
