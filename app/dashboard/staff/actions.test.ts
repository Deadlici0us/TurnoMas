import { beforeEach, describe, expect, it, vi } from "vitest";

import
{
  actualizarFotoStaff,
  actualizarHorariosStaff,
  actualizarPerfilStaff,
  agregarStaff,
  cambiarEstadoStaff,
  eliminarStaff,
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
  return {
    assertModoEditable: vi.fn(),
    DEMO_READONLY_MESSAGE: "La cuenta demo es de solo lectura. Creá tu cuenta gratis para hacer cambios.",
  };
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

interface StubOptions
{
  readonly total?: number | null;
  readonly proximos?: number | null;
  readonly writeError?: { readonly code?: string } | null;
  readonly servicios?: ReadonlyArray<{ readonly id: string }>;
  readonly updateError?: { readonly code?: string } | null;
  readonly deleteError?: { readonly code?: string } | null;
  readonly insertError?: { readonly code?: string } | null;
}

interface Capturas
{
  readonly escrituras: Array<{ readonly tabla: string; readonly fila: unknown }>;
  readonly inserciones: Array<{ readonly tabla: string; readonly fila: unknown }>;
}

/** Query encadenable y awaitable, suficiente para los stubs de Supabase. */
function chain(result: unknown)
{
  const query: Record<string, unknown> = {};
  query.eq = () => query;
  query.gt = () => query;
  query.in = () => query;
  query.then = (resolve: (value: unknown) => unknown) => resolve(result);

  return query;
}

/** Stub del admin con conteos de turnos y escrituras observables. */
function stubAdmin(options: StubOptions = {}): Capturas
{
  const capturas: Capturas = { escrituras: [], inserciones: [] };
  let llamadaConteo = 0;

  mockAdmin.mockReturnValue({
    from: (tabla: string) => ({
      select: () =>
      {
        if (tabla === "servicios")
        {
          return chain({ data: options.servicios ?? [] });
        }

        const count = llamadaConteo === 0 ? options.total ?? 0 : options.proximos ?? 0;
        llamadaConteo += 1;

        return chain({ count, error: null });
      },
      insert: async (fila: unknown) =>
      {
        capturas.inserciones.push({ tabla, fila });

        return { error: options.insertError ?? options.writeError ?? null };
      },
      update: (fila: unknown) =>
      {
        capturas.escrituras.push({ tabla, fila });

        return chain({ error: options.updateError ?? options.writeError ?? null });
      },
      delete: () => chain({ error: options.deleteError ?? options.writeError ?? null }),
    }),
  } as never);

  return capturas;
}

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
function sinSesion(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("agregarStaff",
() =>
{
  it("debería insertar el profesional con horarios por defecto",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin();

    const result = await agregarStaff("  Diego  ");

    expect(result.ok).toBe(true);
    expect(capturas.inserciones[0]?.fila).toMatchObject({ negocio_id: "neg-1", nombre: "Diego" });
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/staff");
  });

  it("debería devolver validación para un nombre inválido",
  async () =>
  {
    sesionDueno();
    stubAdmin();

    const result = await agregarStaff("x");

    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("debería devolver DEMO_READONLY en la cuenta demo",
  async () =>
  {
    mockAssert.mockRejectedValueOnce(new Error(
      "La cuenta demo es de solo lectura. Creá tu cuenta gratis para hacer cambios."));

    const result = await agregarStaff("Diego");

    expect(result).toMatchObject({ ok: false, code: "DEMO_READONLY" });
  });

  it("debería devolver UNAUTHENTICATED sin sesión", async () =>
  {
    sinSesion();

    const result = await agregarStaff("Diego");

    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("debería devolver UNAVAILABLE cuando Supabase falla",
  async () =>
  {
    sesionDueno();
    stubAdmin({ writeError: {} });

    const result = await agregarStaff("Diego");

    expect(result).toMatchObject({
      ok: false,
      error: "No pudimos agregar al profesional. Probá de nuevo.",
    });
  });
});

describe("actualizarHorariosStaff",
() =>
{
  it("debería guardar las franjas normalizadas",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin();

    const result = await actualizarHorariosStaff("staff-1", { lun: "09:00-13:00" });

    expect(result.ok).toBe(true);
    expect(capturas.escrituras[0]?.fila).toMatchObject({
      horarios: expect.objectContaining({ lun: ["09:00-13:00"] }),
    });
  });

  it("debería devolver validación para horarios inválidos",
  async () =>
  {
    sesionDueno();
    stubAdmin();

    const result = await actualizarHorariosStaff("staff-1", 42);

    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });
});

describe("cambiarEstadoStaff",
() =>
{
  it("debería desactivar al profesional",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin();

    const result = await cambiarEstadoStaff("staff-1", false);

    expect(result.ok).toBe(true);
    expect(capturas.escrituras[0]?.fila).toEqual({ activo: false });
  });

  it("debería devolver UNAVAILABLE cuando la actualización falla",
  async () =>
  {
    sesionDueno();
    stubAdmin({ writeError: {} });

    const result = await cambiarEstadoStaff("staff-1", true);

    expect(result).toMatchObject({
      ok: false,
      error: "No pudimos actualizar al profesional. Probá de nuevo.",
    });
  });
});

describe("eliminarStaff",
() =>
{
  it("debería eliminar cuando no hay turnos",
  async () =>
  {
    sesionDueno();
    stubAdmin({ total: 0 });

    const result = await eliminarStaff("staff-1");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/staff");
  });

  it("debería tratar un conteo null como cero",
  async () =>
  {
    sesionDueno();
    stubAdmin({ total: null });

    const result = await eliminarStaff("staff-1");

    expect(result.ok).toBe(true);
  });

  it("debería bloquear cuando solo hay historial",
  async () =>
  {
    sesionDueno();
    stubAdmin({ total: 2, proximos: 0 });

    const result = await eliminarStaff("staff-1");

    expect(result).toMatchObject({ ok: false, code: "staff_con_historial" });
    expect(result.ok === false ? result.error : "").toContain("2 turnos en el historial");
  });

  it("debería bloquear y reportar turnos próximos",
  async () =>
  {
    sesionDueno();
    stubAdmin({ total: 3, proximos: 1 });

    const result = await eliminarStaff("staff-1");

    expect(result).toMatchObject({ ok: false, code: "staff_con_turnos_proximos" });
    expect(result.ok === false ? result.error : "").toContain("1 turno próximo");
  });

  it("debería traducir una FK inesperada a conflicto de historial",
  async () =>
  {
    sesionDueno();
    stubAdmin({ total: 0, deleteError: { code: "23503" } });

    const result = await eliminarStaff("staff-1");

    expect(result).toMatchObject({ ok: false, code: "staff_con_historial" });
  });

  it("debería devolver UNAUTHENTICATED sin sesión", async () =>
  {
    sinSesion();

    const result = await eliminarStaff("staff-1");

    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });
});

describe("actualizarPerfilStaff",
() =>
{
  it("debería guardar descripción y servicios válidos",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin({ servicios: [{ id: "sv1" }] });

    const result = await actualizarPerfilStaff("staff-1", "  Especialista  ", ["sv1", "sv2"]);

    expect(result.ok).toBe(true);
    expect(capturas.escrituras[0]?.fila).toEqual({ descripcion: "Especialista" });
    expect(capturas.inserciones[0]?.fila).toEqual([
      { staff_id: "staff-1", servicio_id: "sv1", negocio_id: "neg-1" },
    ]);
  });

  it("debería limpiar la descripción vacía a null",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin({ servicios: [] });

    const result = await actualizarPerfilStaff("staff-1", "   ", []);

    expect(result.ok).toBe(true);
    expect(capturas.escrituras[0]?.fila).toEqual({ descripcion: null });
  });

  it("debería devolver validación si los servicios no son lista",
  async () =>
  {
    sesionDueno();
    stubAdmin();

    const result = await actualizarPerfilStaff("staff-1", "ok", "sv1");

    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("debería devolver UNAVAILABLE cuando falla el perfil",
  async () =>
  {
    sesionDueno();
    stubAdmin({ updateError: {} });

    const result = await actualizarPerfilStaff("staff-1", "ok", []);

    expect(result).toMatchObject({
      ok: false,
      error: "No pudimos guardar el perfil. Probá de nuevo.",
    });
  });
});

describe("actualizarFotoStaff",
() =>
{
  it("debería guardar la URL saneada",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin();

    const result = await actualizarFotoStaff("staff-1", " https://cdn.test/a.jpg ");

    expect(result.ok).toBe(true);
    expect(capturas.escrituras[0]?.fila).toEqual({ foto_url: "https://cdn.test/a.jpg" });
  });

  it("debería limpiar la foto vacía a null",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin();

    const result = await actualizarFotoStaff("staff-1", "");

    expect(result.ok).toBe(true);
    expect(capturas.escrituras[0]?.fila).toEqual({ foto_url: null });
  });

  it("debería devolver validación para esquemas peligrosos",
  async () =>
  {
    sesionDueno();
    stubAdmin();

    const result = await actualizarFotoStaff("staff-1", "javascript:alert(1)");

    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("debería devolver UNAVAILABLE cuando la actualización falla",
  async () =>
  {
    sesionDueno();
    stubAdmin({ updateError: {} });

    const result = await actualizarFotoStaff("staff-1", "https://cdn.test/a.jpg");

    expect(result).toMatchObject({
      ok: false,
      error: "No pudimos guardar la foto. Probá de nuevo.",
    });
  });
});
