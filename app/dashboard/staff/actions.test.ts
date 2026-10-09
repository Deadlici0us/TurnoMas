import { beforeEach, describe, expect, it, vi } from "vitest";

import { actualizarHorariosStaff, agregarStaff, cambiarEstadoStaff, eliminarStaff } from "./actions";
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

/**
 * Stub genérico del admin con insert/update/delete/select-count.
 *
 * @param error Error de escritura o null.
 * @param count Conteo para el guard de turnos.
 * @param filas Filas capturadas por insert/update.
 */
function stubAdmin(error: { code?: string } | null, count: number | null = 0, filas: unknown[] = [])
{
  const twoEq = { eq: vi.fn(async () => ({ error, count })) };
  const admin = {
    from: vi.fn(() => ({
      insert: vi.fn(async (fila: unknown) =>
      {
        filas.push(fila);

        return { error };
      }),
      update: vi.fn((fila: unknown) =>
      {
        filas.push(fila);

        return { eq: vi.fn(() => twoEq) };
      }),
      delete: vi.fn(() => ({ eq: vi.fn(() => twoEq) })),
      select: vi.fn(() => ({ eq: vi.fn(() => twoEq) })),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("agregarStaff",
() =>
{
  it("debería insertar el profesional con horarios por defecto",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubAdmin(null, 0, filas);

    await agregarStaff("  Diego  ");

    expect(filas[0]).toMatchObject({ negocio_id: "neg-1", nombre: "Diego" });
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/staff");
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
  });

  it("debería rechazar nombres inválidos",
  async () =>
  {
    sesionDueno();
    stubAdmin(null);

    await expect(agregarStaff("x")).rejects.toThrow(RangeError);
  });

  it("debería bloquear en modo demo",
  async () =>
  {
    mockAssert.mockRejectedValueOnce(new Error("La cuenta demo es de solo lectura."));

    await expect(agregarStaff("Diego")).rejects.toThrow("La cuenta demo es de solo lectura.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(agregarStaff("Diego"))
      .rejects.toThrow("Tenés que iniciar sesión para agregar profesionales.");
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubAdmin({});

    await expect(agregarStaff("Diego"))
      .rejects.toThrow("No pudimos agregar al profesional. Probá de nuevo.");
  });
});

describe("actualizarHorariosStaff",
() =>
{
  it("debería guardar las franjas normalizadas",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubAdmin(null, 0, filas);

    await actualizarHorariosStaff("staff-1", { lun: "09:00-13:00" });

    expect(filas[0]).toMatchObject({ horarios: expect.objectContaining({ lun: ["09:00-13:00"] }) });
  });

  it("debería rechazar horarios inválidos",
  async () =>
  {
    sesionDueno();
    stubAdmin(null);

    await expect(actualizarHorariosStaff("staff-1", 42)).rejects.toThrow(RangeError);
  });

  it("debería lanzar cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubAdmin({});

    await expect(actualizarHorariosStaff("staff-1", { lun: "09:00-13:00" }))
      .rejects.toThrow("No pudimos guardar los horarios. Probá de nuevo.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(actualizarHorariosStaff("staff-1", { lun: "09:00-13:00" }))
      .rejects.toThrow("Tenés que iniciar sesión para modificar los horarios.");
  });
});

describe("cambiarEstadoStaff",
() =>
{
  it("debería desactivar al profesional",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubAdmin(null, 0, filas);

    await cambiarEstadoStaff("staff-1", false);

    expect(filas).toEqual([{ activo: false }]);
  });

  it("debería lanzar cuando la actualización falla",
  async () =>
  {
    sesionDueno();
    stubAdmin({});

    await expect(cambiarEstadoStaff("staff-1", true))
      .rejects.toThrow("No pudimos actualizar al profesional. Probá de nuevo.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(cambiarEstadoStaff("staff-1", true))
      .rejects.toThrow("Tenés que iniciar sesión para modificar el equipo.");
  });
});

describe("eliminarStaff",
() =>
{
  it("debería eliminar sin turnos registrados",
  async () =>
  {
    sesionDueno();
    stubAdmin(null, 0);

    await expect(eliminarStaff("staff-1")).resolves.toBeUndefined();
  });

  it("debería eliminar cuando el conteo es null",
  async () =>
  {
    sesionDueno();
    stubAdmin(null, null);

    await expect(eliminarStaff("staff-1")).resolves.toBeUndefined();
  });

  it("debería conservar el historial con turnos registrados",
  async () =>
  {
    sesionDueno();
    stubAdmin(null, 2);

    await expect(eliminarStaff("staff-1"))
      .rejects.toThrow("Tiene turnos registrados. Mejor desactivalo para conservar el historial.");
  });

  it("debería lanzar cuando la eliminación falla",
  async () =>
  {
    sesionDueno();
    stubAdmin({});

    await expect(eliminarStaff("staff-1"))
      .rejects.toThrow("No pudimos eliminar al profesional. Probá de nuevo.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(eliminarStaff("staff-1"))
      .rejects.toThrow("Tenés que iniciar sesión para modificar el equipo.");
  });
});

describe("agregarStaff integración",
() =>
{
  it("debería validar, persistir y revalidar punta a punta",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubAdmin(null, 0, filas);

    await agregarStaff("María");

    expect(filas).toHaveLength(1);
    expect(mockRevalidate).toHaveBeenCalledTimes(2);
  });
});
