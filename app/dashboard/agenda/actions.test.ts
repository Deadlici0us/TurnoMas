import { beforeEach, describe, expect, it, vi } from "vitest";

import { actualizarEstadoTurno } from "./actions";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { assertModoEditable } from "@/lib/auth/demo-guard";
import { cancelarTurno, CancelacionError } from "@/lib/services/cancelacion";
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

vi.mock("@/lib/services/cancelacion", () =>
{
  return {
    cancelarTurno: vi.fn(),
    CancelacionError: class extends Error
    {
      readonly codigo: string;
      readonly status: number;

      constructor(codigo: string, message: string, status: number)
      {
        super(message);
        this.codigo = codigo;
        this.status = status;
      }
    },
  };
});

const mockRevalidate = vi.mocked(revalidatePath);
const mockAssert = vi.mocked(assertModoEditable);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockCancelar = vi.mocked(cancelarTurno);

/** Turno base pagado con seña. */
function turnoPagado(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    estado: "pagado",
    inicio: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    cliente_id: "cli-1",
    servicio_id: "serv-1",
    mp_payment_id: "pay-1",
    ...overrides,
  };
}

interface AgendaTablas
{
  readonly negocio?: unknown;
  readonly turno?: unknown;
  readonly cliente?: unknown;
}

/**
 * Stub del admin con despacho por tabla.
 *
 * @param tablas Filas por tabla.
 * @param updateError Error del update de turnos o null.
 * @param updates Valores capturados por update().
 */
function stubAgenda(tablas: AgendaTablas, updateError: { message: string } | null = null, updates: unknown[] = [])
{
  const singleFor = (tabla: string): { data: unknown } =>
  {
    if (tabla === "negocios")
    {
      return { data: tablas.negocio ?? null };
    }

    if (tabla === "turnos")
    {
      return { data: tablas.turno ?? null };
    }

    if (tabla === "clientes")
    {
      return { data: tablas.cliente ?? null };
    }

    return { data: null };
  };

  const admin = {
    from: vi.fn((tabla: string) => ({
      select: vi.fn(() =>
      {
        const oneEq = {
          eq: vi.fn(() => ({
            single: async () => singleFor(tabla),
          })),
          single: async () => singleFor(tabla),
        };

        return { eq: vi.fn(() => oneEq), single: async () => singleFor(tabla) };
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
  it("debería completar sin efectos externos",
  async () =>
  {
    sesionDueno();
    const updates: unknown[] = [];
    stubAgenda({ negocio: { id: "neg-1" }, turno: turnoPagado() }, null, updates);

    await actualizarEstadoTurno("t-1", "completado");

    expect(updates).toEqual([{ estado: "completado" }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/agenda");
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
  });

  it("debería delegar la cancelación al servicio compartido (actor duenio)",
  async () =>
  {
    sesionDueno();
    stubAgenda({ negocio: { id: "neg-1" }, turno: turnoPagado() });
    mockCancelar.mockResolvedValueOnce({
      estado: "cancelado", reembolso: "devuelta", horasRestantes: 100, retencionHs: 24,
    });

    await actualizarEstadoTurno("t-1", "cancelado");

    expect(mockCancelar).toHaveBeenCalledWith({ turnoId: "t-1", actor: "duenio" });
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/agenda");
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
  });

  it("debería propagar el error del servicio de cancelación",
  async () =>
  {
    sesionDueno();
    stubAgenda({ negocio: { id: "neg-1" }, turno: turnoPagado() });
    mockCancelar.mockRejectedValueOnce(new CancelacionError("ya_cerrado", "Ese turno ya está cerrado.", 409));

    await expect(actualizarEstadoTurno("t-1", "cancelado"))
      .rejects.toThrow("Ese turno ya está cerrado.");
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
