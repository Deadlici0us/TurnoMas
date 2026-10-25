import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardData, getDashboardStats } from "./queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
  negocioError: { message: string; code?: string } | null = null,
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
        const single = async (): Promise<{ data: unknown; error: { message: string; code?: string } | null }> =>
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
  it("debería redirigir al login sin sesión", async () =>
  {
    mockServer.mockRejectedValueOnce(new Error("sin cookies"));

    await expect(getDashboardData()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("debería redirigir al login con usuario nulo", async () =>
  {
    sesionUsuario(null);

    await expect(getDashboardData()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("debería devolver el email del dueño para precargar el pago", async () =>
  {
    sesionUsuario({ id: "user-1", email: "dueno@negocio.com" });
    stubDashboard(NEGOCIO);

    const result = await getDashboardData();

    expect(result.userEmail).toBe("dueno@negocio.com");
  });

  it("debería redirigir al onboarding sin negocio del dueño", async () =>
  {
    sesionUsuario({ id: "user-1" });
    stubDashboard(null);

    await expect(getDashboardData()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("debería lanzar error ante fallas del negocio", async () =>
  {
    sesionUsuario({ id: "user-1" });
    stubDashboard(null, { message: "db caída", code: "500" });

    await expect(getDashboardData()).rejects.toThrow("No pudimos cargar tu negocio");
  });

  it("debería normalizar listas nulas a arreglos", async () =>
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
  it("debería devolver ceros sin negocio", async () =>
  {
    await expect(getDashboardStats("   ")).resolves.toMatchObject({ pendientes: 0, totalIngresos: 0 });
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("debería sumar conteos e ingresos de señas", async () =>
  {
    stubDashboard(NEGOCIO, null, {}, { default: 3 }, [{ sena_monto: 100 }, { sena_monto: null }]);

    const stats = await getDashboardStats("neg-1");

    expect(stats.pendientes).toBe(3);
    expect(stats.totalIngresos).toBe(100);
  });

  it("debería normalizar conteos nulos a cero", async () =>
  {
    stubDashboard(NEGOCIO, null, {}, {}, null);

    const stats = await getDashboardStats("neg-1");

    expect(stats).toMatchObject({ pendientes: 0, totalIngresos: 0 });
  });

  it("debería devolver ceros ante fallas de base", async () =>
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
  it("debería cargar negocio y listas punta a punta", async () =>
  {
    sesionUsuario({ id: "user-1" });
    stubDashboard(NEGOCIO, null, {
      staff: [{ id: "s-1" }],
      servicios: [{ id: "sv-1" }],
      clientes: [{ id: "c-1" }],
      turnos: [{ id: "t-1" }],
    });

    const result = await getDashboardData();

    expect(result.data.turnos).toEqual([{ id: "t-1" }]);
    expect(result.data.clientes).toEqual([{ id: "c-1" }]);
  });
});
