import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearTurnoManual } from "./actions";
import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { sincronizarTurnoConfirmado } from "@/lib/reservas/confirmacion";
import { estaOcupado } from "@/lib/reservas/disponibilidad";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
});

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertModoEditable: vi.fn() };
});

vi.mock("@/lib/dashboard/negocio", () =>
{
  return { getNegocioIdDelDueno: vi.fn() };
});

vi.mock("@/lib/reservas/disponibilidad", () =>
{
  return { estaOcupado: vi.fn() };
});

vi.mock("@/lib/reservas/confirmacion", () =>
{
  return { sincronizarTurnoConfirmado: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAssert = vi.mocked(assertModoEditable);
const mockNegocioId = vi.mocked(getNegocioIdDelDueno);
const mockOcupado = vi.mocked(estaOcupado);
const mockSincronizar = vi.mocked(sincronizarTurnoConfirmado);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

const NEGOCIO = {
  id: "neg-1",
  nombre: "Barbería",
  timezone: "America/Argentina/Buenos_Aires",
  pais: "ar",
  msg_confirmacion_subject: null,
  msg_confirmacion_cuerpo: null,
};

const SERVICIO = {
  id: "serv-1",
  nombre: "Corte",
  duracion_min: 30,
  precio_base: 1000000,
  precio_promocional: null,
  sena_requerida: false,
  sena_porcentaje: 50,
};

interface StubOpts
{
  readonly singles?: Record<string, unknown[]>;
  readonly insertResults?: Record<string, Array<{ data: unknown; error: { code?: string } | null }>>;
  readonly inserts?: Array<{ tabla: string; values: Record<string, unknown> }>;
  readonly updates?: Array<{ tabla: string; values: Record<string, unknown> }>;
  readonly updateError?: { code?: string } | null;
}

/**
 * Stub admin con colas de respuestas por tabla.
 *
 * @param opts Colas de `single()`, resultados de insert y auditoría.
 * @return Cliente admin mínimo.
 */
function stubAdmin(opts: StubOpts = {})
{
  const singles: Record<string, unknown[]> = { ...(opts.singles ?? {}) };
  const insertResults = { ...(opts.insertResults ?? {}) };

  const shift = (tabla: string, mapa: Record<string, unknown[]>): unknown =>
  {
    const cola = mapa[tabla] ?? [];

    return cola.length > 0 ? cola.shift() : null;
  };

  const buildSelect = (tabla: string): Record<string, unknown> =>
  {
    const query: Record<string, unknown> = {};

    query.eq = () => query;
    query.single = async () => shift(tabla, singles);

    return query;
  };

  const admin = {
    from: (tabla: string) => ({
      select: () => buildSelect(tabla),
      insert: (values: Record<string, unknown>) =>
      {
        opts.inserts?.push({ tabla, values });

        return {
          select: () => ({
            single: async () => shift(tabla, insertResults) ?? { data: { id: "t-1" }, error: null },
          }),
        };
      },
      update: (values: Record<string, unknown>) =>
      {
        opts.updates?.push({ tabla, values });

        const query: Record<string, unknown> = {};
        query.eq = () => query;
        query.then = (resolve: (value: unknown) => unknown) =>
          resolve({ error: opts.updateError ?? null });

        return query;
      },
    }),
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
}

/** FormData base de un turno manual válido. */
function formDataTurno(overrides: Record<string, string> = {}): FormData
{
  const data = new FormData();

  data.set("staffId", "staff-1");
  data.set("servicioId", "serv-1");
  data.set("clienteId", "");
  data.set("nombre", "Juan Pérez");
  data.set("whatsapp", "+549110000001");
  data.set("email", "");
  data.set("fecha", "2026-10-06");
  data.set("hora", "10:00");
  data.set("estado", "confirmado");

  for (const [clave, valor] of Object.entries(overrides))
  {
    data.set(clave, valor);
  }

  return data;
}

/** Sesión de dueño autenticado con negocio resuelto. */
function sesionDueno(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
  mockNegocioId.mockResolvedValue("neg-1");
  mockOcupado.mockResolvedValue(false);
  mockSincronizar.mockResolvedValue(undefined);
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("crearTurnoManual",
() =>
{
  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(crearTurnoManual(formDataTurno()))
      .rejects.toThrow("Tenés que iniciar sesión para cargar un turno.");
  });

  it("debería bloquear la cuenta demo",
  async () =>
  {
    mockAssert.mockRejectedValue(new Error("La cuenta demo es de solo lectura."));

    await expect(crearTurnoManual(formDataTurno())).rejects.toThrow("solo lectura");
  });

  it("debería crear un cliente nuevo y un turno confirmado",
  async () =>
  {
    sesionDueno();
    const inserts: StubOpts["inserts"] = [];
    stubAdmin({
      singles: {
        negocios: [{ data: NEGOCIO }],
        staff: [{ data: { id: "staff-1", nombre: "Diego" } }],
        servicios: [{ data: SERVICIO }],
        clientes: [{ data: null }],
      },
      insertResults: {
        clientes: [{ data: { id: "cli-new" }, error: null }],
        turnos: [{ data: { id: "t-1" }, error: null }],
      },
      inserts,
    });

    await expect(crearTurnoManual(formDataTurno())).resolves.toBe("2026-10-06");

    const turno = inserts.find((i) => i.tabla === "turnos")?.values;

    expect(turno).toMatchObject({
      negocio_id: "neg-1",
      staff_id: "staff-1",
      servicio_id: "serv-1",
      cliente_id: "cli-new",
      estado: "confirmado",
      monto_total: 1000000,
      sena_monto: null,
      sena_porcentaje: null,
    });
    expect(mockSincronizar).toHaveBeenCalledWith(expect.objectContaining({
      turnoId: "t-1",
      clienteNombre: "Juan Pérez",
    }));
  });

  it("debería reutilizar un cliente existente por WhatsApp",
  async () =>
  {
    sesionDueno();
    const updates: StubOpts["updates"] = [];
    const inserts: StubOpts["inserts"] = [];
    stubAdmin({
      singles: {
        negocios: [{ data: NEGOCIO }],
        staff: [{ data: { id: "staff-1", nombre: "Diego" } }],
        servicios: [{ data: SERVICIO }],
        clientes: [{ data: { id: "cli-1" } }],
      },
      insertResults: { turnos: [{ data: { id: "t-1" }, error: null }] },
      updates,
      inserts,
    });

    await crearTurnoManual(formDataTurno());

    expect(inserts.some((i) => i.tabla === "clientes")).toBe(false);
    expect(updates.some((u) => u.tabla === "clientes")).toBe(true);
    expect(inserts.find((i) => i.tabla === "turnos")?.values.cliente_id).toBe("cli-1");
  });

  it("debería actualizar el cliente elegido por id",
  async () =>
  {
    sesionDueno();
    const updates: StubOpts["updates"] = [];
    stubAdmin({
      singles: {
        negocios: [{ data: NEGOCIO }],
        staff: [{ data: { id: "staff-1", nombre: "Diego" } }],
        servicios: [{ data: SERVICIO }],
        clientes: [{ data: { id: "cli-1" } }],
      },
      insertResults: { turnos: [{ data: { id: "t-1" }, error: null }] },
      updates,
    });

    await crearTurnoManual(formDataTurno({ clienteId: "cli-1", email: "juan@ejemplo.com" }));

    expect(updates.find((u) => u.tabla === "clientes")?.values)
      .toMatchObject({ nombre: "Juan Pérez", email: "juan@ejemplo.com" });
  });

  it("debería calcular la seña al marcarlo pagado",
  async () =>
  {
    sesionDueno();
    const inserts: StubOpts["inserts"] = [];
    stubAdmin({
      singles: {
        negocios: [{ data: NEGOCIO }],
        staff: [{ data: { id: "staff-1", nombre: "Diego" } }],
        servicios: [{ data: { ...SERVICIO, sena_requerida: true, sena_porcentaje: 50 } }],
        clientes: [{ data: null }],
      },
      insertResults: {
        clientes: [{ data: { id: "cli-new" }, error: null }],
        turnos: [{ data: { id: "t-1" }, error: null }],
      },
      inserts,
    });

    await crearTurnoManual(formDataTurno({ estado: "pagado" }));

    expect(inserts.find((i) => i.tabla === "turnos")?.values).toMatchObject({
      estado: "pagado",
      sena_monto: 500000,
      sena_porcentaje: 50,
    });
  });

  it("debería rechazar un horario ocupado",
  async () =>
  {
    sesionDueno();
    mockOcupado.mockResolvedValue(true);
    stubAdmin({
      singles: {
        negocios: [{ data: NEGOCIO }],
        staff: [{ data: { id: "staff-1", nombre: "Diego" } }],
        servicios: [{ data: SERVICIO }],
        clientes: [{ data: null }],
      },
    });

    await expect(crearTurnoManual(formDataTurno()))
      .rejects.toThrow("Ese horario ya está ocupado");
  });

  it("debería rechazar un profesional ajeno",
  async () =>
  {
    sesionDueno();
    stubAdmin({
      singles: {
        negocios: [{ data: NEGOCIO }],
        staff: [{ data: null }],
        servicios: [{ data: SERVICIO }],
      },
    });

    await expect(crearTurnoManual(formDataTurno())).rejects.toThrow("No encontramos ese profesional.");
  });
});
