import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardData, getDashboardStats } from "./queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

const NEGOCIO = { id: "neg-1", nombre: "Barbería" };

/** Sesión con usuario autenticado. */
function sesionUsuario(user: { id: string; email?: string } | null): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

interface ListasDashboard
{
  readonly staff?: unknown[] | null;
  readonly servicios?: unknown[] | null;
  readonly clientes?: unknown[] | null;
  readonly turnos?: unknown[] | null;
}

/**
 * Stub del admin para el dashboard.
 *
 * @param negocio Fila del negocio o null.
 * @param negocioError Error de la consulta del negocio o null.
 * @param listas Listas por tabla (null = []).
 * @param counts Conteos para las estadísticas.
 * @param pagos Pagos para ingresos.
 */
function stubDashboard(
  negocio: unknown = NEGOCIO,
  negocioError: { message: string } | null = null,
  listas: ListasDashboard = {},
  counts: Record<string, number | null> = {},
  pagos: Array<{ sena_monto: number | null }> | null = [],
)
{
  const admin = {
    from: (tabla: string) => ({
      select: (cols: string) =>
      {
        const listData = tabla === "negocios" ? null : (listas[tabla as keyof ListasDashboard] ?? null);
        const countData = tabla === "turnos" && cols.includes("sena_monto")
          ? { data: pagos }
          : { count: counts[tabla] ?? counts.default ?? null };
        const single = async (): Promise<{ data: unknown; error: { message: string } | null }> =>
        {
          if (tabla === "negocios") return { data: negocio, error: negocioError };

          return { data: null, error: null };
        };
        const eqSecond = Object.assign(Promise.resolve(countData), {
          eq: () => ({ single }),
          single,
          gte: async () => countData,
        });
        const eqFirst = Object.assign(Promise.resolve({ data: listData }), {
          eq: () => eqSecond,
          single,
          gte: async () => countData,
          order: async () => ({ data: listData }),
        });

        return { eq: () => eqFirst, single };
      },
    }),
  };

  mockAdmin.mockReturnValue(admin as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("getDashboardData",
() =>
{
  it("debería devolver seed demo sin sesión",
  async () =>
  {
    mockServer.mockRejectedValueOnce(new Error("sin cookies"));

    const result = await getDashboardData();

    expect(result.error).toBeNull();
    expect(result.isDemo).toBe(true);
    expect(result.userEmail).toBeNull();
    expect(result.data.negocio).toMatchObject({ nombre: "Barbería Diego" });
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("debería devolver el email del dueño para precargar el pago",
  async () =>
  {
    sesionUsuario({ id: "user-1", email: "dueno@negocio.com" });
    stubDashboard(NEGOCIO);

    const result = await getDashboardData();

    expect(result.userEmail).toBe("dueno@negocio.com");
  });

  it("debería devolver seed demo con usuario nulo",
  async () =>
  {
    sesionUsuario(null);

    const result = await getDashboardData();

    expect(result.isDemo).toBe(true);
    expect(result.data.staff.length).toBeGreaterThan(0);
  });

  it("debería marcar demo para el dueño demo con datos reales",
  async () =>
  {
    vi.stubEnv("DEMO_DUENIO_ID", "user-demo");
    sesionUsuario({ id: "user-demo", email: "otro@ejemplo.com" });
    stubDashboard(NEGOCIO, null, { staff: [{ id: "s-1" }], turnos: [] });

    const result = await getDashboardData();

    expect(result.isDemo).toBe(true);
    expect(result.data.negocio).toEqual(NEGOCIO);
    expect(result.data.staff).toEqual([{ id: "s-1" }]);
  });

  it("debería devolver seed sin negocio del dueño",
  async () =>
  {
    sesionUsuario({ id: "user-1" });
    stubDashboard(null);

    const result = await getDashboardData();

    expect(result.error).toBeNull();
    expect(result.isDemo).toBe(false);
    expect(result.data.negocio).toMatchObject({ nombre: "Barbería Diego" });
  });

  it("debería devolver seed ante error del negocio",
  async () =>
  {
    sesionUsuario({ id: "user-1" });
    stubDashboard(null, { message: "db caída" });

    const result = await getDashboardData();

    expect(result.data.servicios.length).toBeGreaterThan(0);
  });

  it("debería normalizar listas nulas a arreglos",
  async () =>
  {
    sesionUsuario({ id: "user-1" });
    stubDashboard(NEGOCIO, null, { staff: null, servicios: null, clientes: null, turnos: null });

    const result = await getDashboardData();

    expect(result.data).toMatchObject({ staff: [], servicios: [], clientes: [], turnos: [] });
  });
});

describe("getDashboardStats",
() =>
{
  it("debería devolver ceros sin negocio",
  async () =>
  {
    await expect(getDashboardStats("   ")).resolves.toMatchObject({ turnosHoy: 0, totalIngresos: 0 });
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("debería sumar conteos e ingresos de señas",
  async () =>
  {
    stubDashboard(NEGOCIO, null, {}, { default: 3 }, [{ sena_monto: 100 }, { sena_monto: null }]);

    const stats = await getDashboardStats("neg-1");

    expect(stats.turnosHoy).toBe(3);
    expect(stats.pendientes).toBe(3);
    expect(stats.totalIngresos).toBe(100);
  });

  it("debería normalizar conteos nulos a cero",
  async () =>
  {
    stubDashboard(NEGOCIO, null, {}, {}, null);

    const stats = await getDashboardStats("neg-1");

    expect(stats).toMatchObject({ turnosHoy: 0, totalIngresos: 0 });
  });

  it("debería devolver ceros ante fallas de base",
  async () =>
  {
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("db caída");
    });

    const stats = await getDashboardStats("neg-1");

    expect(stats).toMatchObject({ pendientes: 0, totalIngresos: 0 });
  });
});

describe("getDashboardData integración",
() =>
{
  it("debería cargar negocio y listas punta a punta",
  async () =>
  {
    sesionUsuario({ id: "user-1" });
    stubDashboard(NEGOCIO, null, {
      staff: [{ id: "s-1" }],
      servicios: [{ id: "sv-1" }],
      clientes: [{ id: "c-1" }],
      turnos: [{ id: "t-1" }],
    });

    const result = await getDashboardData();

    expect(result.isDemo).toBe(false);
    expect(result.data.turnos).toEqual([{ id: "t-1" }]);
    expect(result.data.clientes).toEqual([{ id: "c-1" }]);
  });
});
