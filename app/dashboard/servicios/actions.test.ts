import { beforeEach, describe, expect, it, vi } from "vitest";

import { cambiarEstadoServicio, eliminarServicio, guardarServicio } from "./actions";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
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
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockNegocio = vi.mocked(getNegocioIdDelDueno);

/**
 * FormData con los campos del formulario de servicios.
 *
 * @param entries Pares clave/valor del formulario.
 */
function formulario(entries: Record<string, string>): FormData
{
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries))
  {
    formData.append(key, value);
  }

  return formData;
}

/** Formulario válido mínimo (sin promo ni seña). */
function formularioValido(): FormData
{
  return formulario({ nombre: "Corte clásico", duracionMin: "30", precioBase: "5000" });
}

/** Sesión de dueño autenticado con negocio resuelto. */
function sesionDueno(): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
  mockNegocio.mockResolvedValue("neg-1");
}

/**
 * Stub de `servicios` para insert/update/delete.
 *
 * @param error Error de Supabase o null.
 * @param filas Filas capturadas por insert/update.
 * @param mpToken Token MP del negocio (null = sin conectar).
 */
function stubServicios(error: { code?: string } | null, filas: unknown[] = [], mpToken: string | null = "APP_USR-x")
{
  const admin = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: async () => ({ data: { mercadopago_access_token: mpToken } }),
        })),
      })),
      insert: vi.fn(async (fila: unknown) =>
      {
        filas.push(fila);

        return { error };
      }),
      update: vi.fn((fila: unknown) =>
      {
        filas.push(fila);

        return {
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ error })),
          })),
        };
      }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error })),
        })),
      })),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("guardarServicio",
() =>
{
  it("debería insertar el servicio con valores mapeados",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubServicios(null, filas);

    await guardarServicio(null, formularioValido());

    expect(filas).toEqual([{
      negocio_id: "neg-1",
      nombre: "Corte clásico",
      duracion_min: 30,
      precio_base: 5000,
      precio_promocional: null,
      sena_requerida: false,
      sena_porcentaje: 0,
      remarketing: true,
      remarketing_dias: null,
    }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/servicios");
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
  });

  it("debería actualizar cuando hay servicioId",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    const admin = stubServicios(null, filas);

    await guardarServicio("serv-1", formularioValido());

    expect(admin.from).toHaveBeenCalledWith("servicios");
    expect(filas).toHaveLength(1);
  });

  it("debería guardar promo, seña y remarketing opcionales",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubServicios(null, filas);

    await guardarServicio(null, formulario({
      nombre: "Color",
      duracionMin: "60",
      precioBase: "8000",
      precioPromocional: "6500",
      promoActiva: "on",
      senaRequerida: "on",
      senaPorcentaje: "50",
      remarketingActivo: "on",
      remarketingDias: "7",
    }));

    expect(filas[0]).toMatchObject({
      precio_promocional: 6500,
      sena_requerida: true,
      sena_porcentaje: 50,
      remarketing_dias: 7,
    });
  });

  it("debería rechazar números vacíos",
  async () =>
  {
    sesionDueno();
    stubServicios(null);

    await expect(guardarServicio(null, formulario({ nombre: "Corte", duracionMin: "", precioBase: "5000" })))
      .rejects.toThrow("Completá todos los datos numéricos del servicio.");
  });

  it("debería rechazar números no enteros",
  async () =>
  {
    sesionDueno();
    stubServicios(null);

    await expect(guardarServicio(null, formulario({ nombre: "Corte", duracionMin: "30", precioBase: "abc" })))
      .rejects.toThrow("Los datos numéricos del servicio tienen que ser enteros.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubServicios({});

    await expect(guardarServicio(null, formularioValido()))
      .rejects.toThrow("No pudimos guardar el servicio. Probá de nuevo.");
  });


  it("debería exigir MercadoPago conectado para activar seña",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubServicios(null, filas, null);

    await expect(guardarServicio(null, formulario({
      nombre: "Corte",
      duracionMin: "30",
      precioBase: "5000",
      senaRequerida: "on",
      senaPorcentaje: "50",
    }))).rejects.toThrow("Conectá tu MercadoPago antes de activar señas");
    expect(filas).toHaveLength(0);
  });

  it("debería guardar seña con MercadoPago conectado",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubServicios(null, filas, "APP_USR-negocio");

    await guardarServicio(null, formulario({
      nombre: "Corte",
      duracionMin: "30",
      precioBase: "5000",
      senaRequerida: "on",
      senaPorcentaje: "50",
    }));

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ sena_requerida: true, sena_porcentaje: 50 });
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(guardarServicio(null, formularioValido()))
      .rejects.toThrow("Tenés que iniciar sesión para modificar servicios.");
  });
});

describe("eliminarServicio",
() =>
{
  it("debería eliminar el servicio del negocio",
  async () =>
  {
    sesionDueno();
    stubServicios(null);

    await expect(eliminarServicio("serv-1")).resolves.toBeUndefined();
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/servicios");
  });

  it("debería sugerir desactivar con turnos asociados (23503)",
  async () =>
  {
    sesionDueno();
    stubServicios({ code: "23503" });

    await expect(eliminarServicio("serv-1"))
      .rejects.toThrow("No se puede eliminar porque tiene turnos asociados. Desactivalo en su lugar.");
  });

  it("debería lanzar genérico ante otros errores",
  async () =>
  {
    sesionDueno();
    stubServicios({ code: "500" });

    await expect(eliminarServicio("serv-1"))
      .rejects.toThrow("No pudimos eliminar el servicio. Probá de nuevo.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(eliminarServicio("serv-1"))
      .rejects.toThrow("Tenés que iniciar sesión para modificar servicios.");
  });
});

describe("cambiarEstadoServicio",
() =>
{
  it("debería activar y desactivar el servicio",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubServicios(null, filas);

    await cambiarEstadoServicio("serv-1", false);

    expect(filas).toEqual([{ activo: false }]);
  });

  it("debería lanzar cuando la actualización falla",
  async () =>
  {
    sesionDueno();
    stubServicios({});

    await expect(cambiarEstadoServicio("serv-1", true))
      .rejects.toThrow("No pudimos actualizar el servicio. Probá de nuevo.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(cambiarEstadoServicio("serv-1", true))
      .rejects.toThrow("Tenés que iniciar sesión para modificar servicios.");
  });
});

describe("guardarServicio integración",
() =>
{
  it("debería validar, persistir y revalidar punta a punta",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubServicios(null, filas);

    await guardarServicio("serv-9", formulario({
      nombre: "  Corte  ",
      duracionMin: "45",
      precioBase: "6000",
    }));

    expect(filas[0]).toMatchObject({ negocio_id: "neg-1", nombre: "Corte", duracion_min: 45 });
    expect(mockRevalidate).toHaveBeenCalledTimes(2);
  });
});
