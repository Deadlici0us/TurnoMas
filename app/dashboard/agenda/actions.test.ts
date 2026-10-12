import { beforeEach, describe, expect, it, vi } from "vitest";

import { actualizarEstadoTurno } from "./actions";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { assertModoEditable } from "@/lib/auth/demo-guard";
import { calendarService } from "@/lib/services/calendar";
import { crearEventoGoogleParaTurno } from "@/lib/services/calendar-sync";
import { paymentService } from "@/lib/services/payment";
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

vi.mock("@/lib/services/calendar-sync", () =>
{
  return { crearEventoGoogleParaTurno: vi.fn() };
});

const mockRevalidate = vi.mocked(revalidatePath);
const mockAssert = vi.mocked(assertModoEditable);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockCrearEvento = vi.mocked(crearEventoGoogleParaTurno);

/** Turno base pagado con seña y evento de Google. */
function turnoPagado(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    estado: "pagado",
    inicio: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    cliente_id: "cli-1",
    servicio_id: "serv-1",
    mp_payment_id: "pay-1",
    google_calendar_event_id: "evt-1",
    ...overrides,
  };
}

interface AgendaTablas
{
  readonly negocio?: unknown;
  readonly turno?: unknown;
  readonly servicio?: unknown;
  readonly negocioRow?: unknown;
  readonly cliente?: unknown;
}

/**
 * Stub del admin con despacho por tabla y columnas del select.
 *
 * @param tablas Filas por tabla.
 * @param updateError Error del update de turnos o null.
 * @param updates Valores capturados por update().
 */
function stubAgenda(tablas: AgendaTablas, updateError: { message: string } | null = null, updates: unknown[] = [])
{
  const singleFor = (tabla: string, cols: string): { data: unknown } =>
  {
    if (tabla === "negocios")
    {
      return { data: cols.includes("sena_retencion_hs") ? tablas.negocioRow ?? null : tablas.negocio ?? null };
    }

    if (tabla === "turnos")
    {
      return { data: tablas.turno ?? null };
    }

    if (tabla === "servicios")
    {
      return { data: tablas.servicio ?? null };
    }

    if (tabla === "clientes")
    {
      return { data: tablas.cliente ?? null };
    }

    return { data: null };
  };

  const admin = {
    from: vi.fn((tabla: string) => ({
      select: vi.fn((cols: string) =>
      {
        const oneEq = {
          eq: vi.fn(() => ({
            single: async () => singleFor(tabla, cols),
          })),
          single: async () => singleFor(tabla, cols),
        };

        return { eq: vi.fn(() => oneEq), single: async () => singleFor(tabla, cols) };
      }),
      update: vi.fn((values: unknown) =>
      {
        updates.push(values);

        return { eq: vi.fn(async () => ({ error: updateError })) };
      }),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
}

/** Sesión de dueño autenticado. */
function sesionDueno(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("actualizarEstadoTurno guardas",
() =>
{
  it("debería rechazar estados inexistentes (Set)",
  async () =>
  {
    sesionDueno();
    stubAgenda({});

    await expect(actualizarEstadoTurno("t-1", "inexistente" as EstadoTurno))
      .rejects.toThrow("Ese estado de turno no existe.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(actualizarEstadoTurno("t-1", "completado"))
      .rejects.toThrow("Tenés que iniciar sesión para modificar la agenda.");
  });

  it("debería exigir negocio del dueño",
  async () =>
  {
    sesionDueno();
    stubAgenda({ negocio: null, turno: turnoPagado() });

    await expect(actualizarEstadoTurno("t-1", "completado"))
      .rejects.toThrow("No encontramos tu negocio.");
  });

  it("debería exigir turno de la agenda",
  async () =>
  {
    sesionDueno();
    stubAgenda({ negocio: { id: "neg-1" }, turno: null });

    await expect(actualizarEstadoTurno("t-1", "completado"))
      .rejects.toThrow("No encontramos ese turno en tu agenda.");
  });

  it("debería rechazar transiciones no permitidas",
  async () =>
  {
    sesionDueno();
    stubAgenda({ negocio: { id: "neg-1" }, turno: turnoPagado({ estado: "pendiente" }) });

    await expect(actualizarEstadoTurno("t-1", "completado"))
      .rejects.toThrow("No se puede marcar ausente un turno sin cobrar.");
  });

  it("debería lanzar cuando el update falla",
  async () =>
  {
    sesionDueno();
    stubAgenda({ negocio: { id: "neg-1" }, turno: turnoPagado() }, { message: "db" });

    await expect(actualizarEstadoTurno("t-1", "completado"))
      .rejects.toThrow("No pudimos actualizar el turno. Probá de nuevo.");
  });
});

describe("actualizarEstadoTurno transiciones",
() =>
{
  it("debería completar sin reembolso ni GCal",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({ negocio: { id: "neg-1" }, turno: turnoPagado() }, null, updates);
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    const deleteSpy = vi.spyOn(calendarService, "deleteEventForNegocio");

    await actualizarEstadoTurno("t-1", "completado");

    expect(updates).toEqual([{ estado: "completado" }]);
    expect(refundSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(mockCrearEvento).not.toHaveBeenCalled();
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/agenda");
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
  });

  it("debería crear el evento de Google al pasar a pagado",
  async () =>
  {
    sesionDueno();
    stubAgenda({ negocio: { id: "neg-1" }, turno: turnoPagado({ estado: "pendiente" }) });

    await actualizarEstadoTurno("t-1", "pagado");

    expect(mockCrearEvento).toHaveBeenCalledWith("t-1");
  });

  it("debería reembolsar y borrar el evento al cancelar con seña",
  async () =>
  {
    sesionDueno();
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado(),
      servicio: { reembolso_auto: true },
      negocioRow: { sena_retencion_hs: 24 },
    });
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockResolvedValueOnce(undefined);
    const deleteSpy = vi.spyOn(calendarService, "deleteEventForNegocio");
    deleteSpy.mockResolvedValueOnce(undefined);

    await actualizarEstadoTurno("t-1", "cancelado");

    expect(refundSpy).toHaveBeenCalledWith("neg-1", "pay-1");
    expect(deleteSpy).toHaveBeenCalledWith("neg-1", "evt-1");
  });

  it("debería cancelar igual cuando el reembolso falla (best-effort)",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado(),
      servicio: { reembolso_auto: true },
      negocioRow: { sena_retencion_hs: 24 },
    }, null, updates);
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockRejectedValueOnce(new Error("mp caído"));

    await expect(actualizarEstadoTurno("t-1", "cancelado")).resolves.toBeUndefined();
    expect(updates).toEqual([{ estado: "cancelado" }]);
  });

  it("debería reembolsar con servicio e inicio sin tipar (fallbacks)",
  async () =>
  {
    sesionDueno();
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado({ servicio_id: 123, inicio: "no-fecha" }),
      servicio: null,
      negocioRow: { sena_retencion_hs: 24 },
    });
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockResolvedValueOnce(undefined);

    await actualizarEstadoTurno("t-1", "cancelado");

    expect(refundSpy).toHaveBeenCalledWith("neg-1", "pay-1");
  });

  it("debería cancelar sin reembolso cuando no hay paymentId",
  async () =>
  {
    sesionDueno();
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado({ mp_payment_id: null }),
      servicio: { reembolso_auto: true },
      negocioRow: { sena_retencion_hs: 24 },
    });
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");

    await actualizarEstadoTurno("t-1", "cancelado");

    expect(refundSpy).not.toHaveBeenCalled();
  });

  it("debería no reembolsar dos veces si la seña ya fue devuelta",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado({ sena_reembolsada: true }),
      servicio: { reembolso_auto: true },
      negocioRow: { sena_retencion_hs: 24 },
    }, null, updates);
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");

    await actualizarEstadoTurno("t-1", "cancelado");

    expect(refundSpy).not.toHaveBeenCalled();
    expect(updates).toEqual([{ estado: "cancelado" }]);
  });

  it("debería marcar la seña como reembolsada tras devolverla",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado({ sena_reembolsada: false }),
      servicio: { reembolso_auto: true },
      negocioRow: { sena_retencion_hs: 24 },
    }, null, updates);
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockResolvedValueOnce(undefined);

    await actualizarEstadoTurno("t-1", "cancelado");

    expect(refundSpy).toHaveBeenCalledOnce();
    expect(updates).toContainEqual(
      expect.objectContaining({ sena_reembolsada: true }),
    );
  });

  it("debería no marcar reembolso cuando MP falla (reintentable)",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado({ sena_reembolsada: false }),
      servicio: { reembolso_auto: true },
      negocioRow: { sena_retencion_hs: 24 },
    }, null, updates);
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockRejectedValueOnce(new Error("mp caído"));

    await expect(actualizarEstadoTurno("t-1", "cancelado")).resolves.toBeUndefined();
    expect(updates).toEqual([{ estado: "cancelado" }]);
  });

  it("debería registrar la ausencia del cliente",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado({ estado: "confirmado" }),
      cliente: { ausencias: 1 },
    }, null, updates);

    await actualizarEstadoTurno("t-1", "ausente");

    expect(updates).toContainEqual({ ausencias: 2 });
  });

  it("debería marcar ausente sin cliente asociado",
  async () =>
  {
    sesionDueno();
    const admin = stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado({ estado: "confirmado", cliente_id: 123 }),
    });

    await expect(actualizarEstadoTurno("t-1", "ausente")).resolves.toBeUndefined();
    expect(admin.from).not.toHaveBeenCalledWith("clientes");
  });
});

describe("actualizarEstadoTurno integración",
() =>
{
  it("debería cancelar con reembolso, GCal y revalidación punta a punta",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({
      negocio: { id: "neg-1" },
      turno: turnoPagado(),
      servicio: { reembolso_auto: true },
      negocioRow: { sena_retencion_hs: 24 },
    }, null, updates);
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockResolvedValueOnce(undefined);
    const deleteSpy = vi.spyOn(calendarService, "deleteEventForNegocio");
    deleteSpy.mockResolvedValueOnce(undefined);

    await actualizarEstadoTurno("t-1", "cancelado");

    expect(refundSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).toHaveBeenCalledOnce();
    expect(updates).toEqual([
      expect.objectContaining({ sena_reembolsada: true }),
      { estado: "cancelado" },
    ]);
    expect(mockRevalidate).toHaveBeenCalledTimes(2);
  });
});
