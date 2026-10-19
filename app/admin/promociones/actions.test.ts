import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { aplicarPromocion, finalizarPromocion } from "./actions";
import { promocionService } from "@/lib/services/promociones";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
});

vi.mock("next/navigation", () =>
{
  return { redirect: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/services/promociones", () =>
{
  return { promocionService: { aplicar: vi.fn(), finalizar: vi.fn() } };
});

const mockRevalidate = vi.mocked(revalidatePath);
const mockRedirect = vi.mocked(redirect);
const mockServer = vi.mocked(getSupabaseServer);
const mockAplicar = vi.mocked(promocionService.aplicar);
const mockFinalizar = vi.mocked(promocionService.finalizar);

/**
 * FormData con los campos de la acción.
 *
 * @param entries Pares clave/valor.
 * @return Formulario listo para la action.
 */
function formulario(entries: Record<string, string>): FormData
{
  const formData = new FormData();

  for (const [clave, valor] of Object.entries(entries))
  {
    formData.append(clave, valor);
  }

  return formData;
}

/** Sesión autenticada con el email indicado. */
function sesion(email: string): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { email } } }) },
  } as never);
}

/** Resultado de sincronización exitoso. */
function sincronizacionOk()
{
  return { monto: 11999, sincronizada: true, error: null };
}

beforeEach(() =>
{
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_EMAIL", "admin@turnomas.com");
  mockAplicar.mockResolvedValue({
    promocion: {
      id: "promo-1",
      negocioId: "neg-1",
      porcentaje: 20,
      motivo: null,
      vigenteDesde: "2026-10-19T12:00:00.000Z",
      vigenteHasta: "2027-01-19T12:00:00.000Z",
      activo: true,
      sincronizadoEn: null,
      ultimoError: null,
      createdBy: "admin@turnomas.com",
    },
    sincronizacion: sincronizacionOk(),
  });
  mockFinalizar.mockResolvedValue(sincronizacionOk());
});

describe("aplicarPromocion",
() =>
{
  it("debería aplicar la promo y revalidar las vistas",
  async () =>
  {
    sesion("Admin@TurnoMas.com");

    await aplicarPromocion(formulario({
      negocioId: "neg-1",
      porcentaje: "20",
      meses: "3",
      motivo: "  Lanzamiento  ",
    }));

    expect(mockAplicar).toHaveBeenCalledWith({
      negocioId: "neg-1",
      porcentaje: 20,
      meses: 3,
      motivo: "Lanzamiento",
      createdBy: "Admin@TurnoMas.com",
    });
    expect(mockRevalidate).toHaveBeenCalledWith("/admin/promociones");
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/suscripcion");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/promociones?ok=1");
  });

  it("debería avisar cuando MP no confirma la sincronización",
  async () =>
  {
    sesion("admin@turnomas.com");
    mockAplicar.mockResolvedValue({
      promocion: {
        id: "promo-1",
        negocioId: "neg-1",
        porcentaje: 20,
        motivo: null,
        vigenteDesde: "2026-10-19T12:00:00.000Z",
        vigenteHasta: "2027-01-19T12:00:00.000Z",
        activo: true,
        sincronizadoEn: null,
        ultimoError: "MP caído",
        createdBy: "admin@turnomas.com",
      },
      sincronizacion: { monto: 11999, sincronizada: false, error: "MP caído" },
    });

    await aplicarPromocion(formulario({
      negocioId: "neg-1",
      porcentaje: "20",
      meses: "3",
    }));

    expect(mockRedirect).toHaveBeenCalledWith(
      "/admin/promociones?error=MP+ca%C3%ADdo",
    );
  });

  it("debería rechazar a un email que no es el admin",
  async () =>
  {
    sesion("otro@turnomas.com");

    await expect(aplicarPromocion(formulario({
      negocioId: "neg-1",
      porcentaje: "20",
      meses: "3",
    }))).rejects.toThrow("No autorizado.");

    expect(mockAplicar).not.toHaveBeenCalled();
  });

  it("debería rechazar campos numéricos inválidos",
  async () =>
  {
    sesion("admin@turnomas.com");

    await expect(aplicarPromocion(formulario({
      negocioId: "neg-1",
      porcentaje: "20.5",
      meses: "3",
    }))).rejects.toThrow("debe ser un entero");
  });
});

describe("finalizarPromocion",
() =>
{
  it("debería terminar la promo y revalidar",
  async () =>
  {
    sesion("admin@turnomas.com");

    await finalizarPromocion(formulario({ negocioId: "neg-1" }));

    expect(mockFinalizar).toHaveBeenCalledWith("neg-1");
    expect(mockRevalidate).toHaveBeenCalledWith("/admin/promociones");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/promociones?ok=1");
  });

  it("debería avisar el error de sincronización al terminar",
  async () =>
  {
    sesion("admin@turnomas.com");
    mockFinalizar.mockResolvedValue({ monto: 14999, sincronizada: false, error: "MP caído" });

    await finalizarPromocion(formulario({ negocioId: "neg-1" }));

    expect(mockRedirect).toHaveBeenCalledWith(
      "/admin/promociones?error=MP+ca%C3%ADdo",
    );
  });
});
