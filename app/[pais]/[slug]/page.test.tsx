import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PortalPage from "./page";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/navigation", () =>
{
  return {
    notFound: () =>
    {
      throw new Error("NEXT_NOT_FOUND");
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

function params(pais: string, slug: string)
{
  return Promise.resolve({ pais, slug });
}

function modoSupabase(): void
{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
}

/**
 * Stub del portal supabase.
 *
 * @param negocio Fila del negocio o null.
 * @param legacy Fila legacy o null.
 * @param staff Staff del portal.
 * @param servicios Servicios del portal.
 * @param turnos Turnos para disponibilidad.
 */
interface EspiaTurnos
{
  readonly columnas: () => string;
  readonly inicioMinimo: () => string;
}

function stubPortal(
  negocio: unknown,
  legacy: unknown = null,
  staff: unknown[] = [],
  servicios: unknown[] = [],
  turnos: unknown[] = [],
): EspiaTurnos
{
  let negocioCalls = 0;
  let columnasTurnos = "";
  let inicioMinimoTurnos = "";
  const listas: Record<string, unknown[]> = { portal_staff: staff, portal_servicios: servicios };
  mockServer.mockResolvedValue({
    from: (tabla: string) => ({
      select: () =>
      {
        const eqSecond = Object.assign(Promise.resolve({ data: listas[tabla] ?? [] }), {
          eq: () => ({
            single: async () =>
            {
              if (tabla === "portal_negocios")
              {
                negocioCalls += 1;

                return { data: negocioCalls === 1 ? negocio : legacy };
              }

              return { data: null };
            },
          }),
          single: async () => ({ data: null }),
        });

        return { eq: () => eqSecond, single: async () => ({ data: null }) };
      },
    }),
  } as never);
  mockAdmin.mockReturnValue({
    from: (tabla: string) => ({
      select: (columnas: string) =>
      {
        if (tabla === "turnos")
        {
          columnasTurnos = columnas;
        }

        return {
          eq: () => ({
            gte: (_columna: string, valor: string) =>
            {
              if (tabla === "turnos")
              {
                inicioMinimoTurnos = valor;
              }

              return {
                order: async () => ({ data: turnos }),
              };
            },
          }),
        };
      },
    }),
  } as never);

  return {
    columnas: () => columnasTurnos,
    inicioMinimo: () => inicioMinimoTurnos,
  };
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("PortalPage demo",
() =>
{
  it("debería mostrar el negocio demo",
  async () =>
  {
    render(await PortalPage({ params: params("ar", "negocio-demo") }));

    expect(screen.getByText("Negocio Demo")).toBeDefined();
    expect(screen.getByText("Reservas por TurnoMas")).toBeDefined();
  });

  it("debería responder 404 con slug desconocido",
  async () =>
  {
    await expect(PortalPage({ params: params("ar", "otra") })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("PortalPage supabase",
() =>
{
  it("debería responder 404 sin servidor",
  async () =>
  {
    modoSupabase();
    mockServer.mockRejectedValueOnce(new Error("supabase caído"));

    await expect(PortalPage({ params: params("ar", "x") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("debería responder 404 sin negocio ni legacy",
  async () =>
  {
    modoSupabase();
    stubPortal(null, null);

    await expect(PortalPage({ params: params("ar", "x") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("debería usar el fallback legacy sin horarios",
  async () =>
  {
    modoSupabase();
    stubPortal(null, { id: "neg-1", nombre: "Barbería", pais: "ar", slug: "x" }, [], [], []);

    render(await PortalPage({ params: params("ar", "x") }));

    expect(screen.getByText("Barbería")).toBeDefined();
  });

  it("debería mostrar negocio con horarios y turnos",
  async () =>
  {
    modoSupabase();
    stubPortal(
      {
        id: "neg-1",
        nombre: "Barbería",
        pais: "ar",
        slug: "x",
        horarios: { lun: "08:00-22:00", mar: ["09:00-13:00"], mie: 123, jue: [] },
        timezone: "America/Argentina/Buenos_Aires",
      },
      null,
      [{ id: "s-1", nombre: "Diego", horarios: {} }],
      [{
        id: "sv-1",
        nombre: "Corte",
        duracion_min: 30,
        precio_base: 10000,
        precio_promocional: null,
        sena_requerida: false,
        sena_porcentaje: 0,
      }],
      [{ staff_id: "s-1", servicio_id: "sv-1", inicio: new Date(Date.now() + 86_400_000).toISOString() }],
    );

    render(await PortalPage({ params: params("ar", "x") }));

    expect(screen.getByText("Barbería")).toBeDefined();
  });

  it("debería traer el fin y los turnos en curso para la disponibilidad",
  async () =>
  {
    modoSupabase();
    const espia = stubPortal({
      id: "neg-1",
      nombre: "Barbería",
      pais: "ar",
      slug: "x",
      horarios: {},
      timezone: "America/Argentina/Buenos_Aires",
    });

    render(await PortalPage({ params: params("ar", "x") }));

    expect(espia.columnas()).toContain("fin");
    expect(new Date(espia.inicioMinimo()).getTime()).toBeLessThan(Date.now() - 60_000);
  });

  it("debería mostrar logo, descripción y mapa cuando están cargados",
  async () =>
  {
    modoSupabase();
    stubPortal({
      id: "neg-1",
      nombre: "Barbería",
      pais: "ar",
      slug: "x",
      logo_url: "https://cdn.example.com/logo.png",
      descripcion: "Cortes sin esperas",
      google_maps_url: "https://www.google.com/maps/@-34.6037,-58.3816,17z",
      horarios: {},
      timezone: "America/Argentina/Buenos_Aires",
    });

    render(await PortalPage({ params: params("ar", "x") }));

    expect(screen.getByText("Cortes sin esperas")).toBeDefined();
    expect(screen.getByAltText("Barbería")).toBeDefined();
    expect(screen.getByTitle("Ubicación de Barbería")).toBeDefined();
  });

  it("no debería mostrar mapa sin link de Maps o sin coordenadas",
  async () =>
  {
    modoSupabase();
    stubPortal({
      id: "neg-1",
      nombre: "Barbería",
      pais: "ar",
      slug: "x",
      google_maps_url: "https://www.google.com/maps/place/SinCoords",
    });

    render(await PortalPage({ params: params("ar", "x") }));

    expect(screen.queryByTitle(/Ubicación de/)).toBeNull();
  });

  it("debería normalizar filas con tipos raros",
  async () =>
  {
    modoSupabase();
    stubPortal(
      { id: 1, nombre: null, pais: null, slug: null, horarios: "no-objeto", timezone: null },
      null,
      [{ id: 1, nombre: null }],
      [{
        id: "sv-1",
        nombre: "Corte",
        duracion_min: "x",
        precio_base: null,
        precio_promocional: null,
        sena_requerida: "yes",
        sena_porcentaje: null,
      }],
      [{ staff_id: 1, servicio_id: 1, inicio: 123 }],
    );

    render(await PortalPage({ params: params("ar", "x") }));

    expect(screen.getByText("Reservas por TurnoMas")).toBeDefined();
  });

  it("debería tolerar fallas de turnos",
  async () =>
  {
    modoSupabase();
    stubPortal({ id: "neg-1", nombre: "Barbería", pais: "ar", slug: "x" });
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("sin service key");
    });

    render(await PortalPage({ params: params("ar", "x") }));

    expect(screen.getByText("Barbería")).toBeDefined();
  });
});
