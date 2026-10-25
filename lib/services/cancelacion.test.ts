import { beforeEach, describe, expect, it, vi } from "vitest";

import { cancelarTurno } from "./cancelacion";
import { paymentService } from "./payment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Turno pagado con seña. */
function turnoPagado(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    negocio_id: "neg-1",
    estado: "pagado",
    inicio: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    cliente_id: "cli-1",
    servicio_id: "serv-1",
    mp_payment_id: "pay-1",
    sena_reembolsada: false,
    ...overrides,
  };
}

interface Tablas
{
  readonly turno?: unknown;
  readonly turnoError?: { code: string; message: string } | null;
  readonly servicio?: unknown;
  readonly negocio?: unknown;
  readonly reembolsoExistente?: unknown;
  readonly claim?: unknown;
  readonly cancelUpdate?: { error: { message: string } | null; count?: number | null };
}

/**
 * Stub admin con despacho por tabla y RPC.
 *
 * @param tablas Filas por tabla.
 * @param auditoria Ops capturadas (updates/inserts).
 */
function stubAdmin(tablas: Tablas, auditoria: { updates: unknown[]; inserts: unknown[] } = {
  updates: [], inserts: [],
})
{
  const singleFor = (tabla: string): { data: unknown; error: { code: string; message: string } | null } =>
  {
    if (tabla === "turnos")
    {
      return { data: tablas.turno ?? null, error: tablas.turnoError ?? null };
    }

    if (tabla === "servicios")
    {
      return { data: tablas.servicio ?? { reembolso_auto: true }, error: null };
    }

    if (tabla === "negocios")
    {
      return { data: tablas.negocio ?? { sena_retencion_hs: 24 }, error: null };
    }

    if (tabla === "reembolsos")
    {
      return { data: tablas.reembolsoExistente ?? null, error: null };
    }

    return { data: null, error: null };
  };

  mockAdmin.mockReturnValue({
    from: (tabla: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => singleFor(tabla),
          }),
          single: async () => singleFor(tabla),
          maybeSingle: async () => singleFor(tabla),
        }),
        single: async () => singleFor(tabla),
      }),
      insert: (values: unknown) =>
      {
        auditoria.inserts.push({ tabla, values });

        return { select: () => ({ single: async () => ({ data: values, error: null }) }) };
      },
      update: (values: unknown) =>
      {
        auditoria.updates.push({ tabla, values });

        const resultado = async (): Promise<{
          error: { message: string } | null; data: unknown;
        }> =>
        {
          const configurado = tablas.cancelUpdate;

          if (configurado !== undefined && "error" in configurado && configurado.error !== null)
          {
            return { error: configurado.error, data: null };
          }

          return { error: null, data: [{ id: "t-1" }] };
        };
        const chain: Record<string, unknown> = {};

        chain.eq = (): Record<string, unknown> => chain;
        chain.select = resultado;
        chain.single = resultado;
        chain.maybeSingle = resultado;
        chain.then = (
          resolver: (valor: { error: null; data: unknown[] }) => unknown,
        ): Promise<unknown> => Promise.resolve({ error: null, data: [{ id: "t-1" }] })
          .then(resolver);

        return chain;
      },
    }),
    rpc: async (nombre: string) =>
    {
      if (nombre === "reclamar_reembolso")
      {
        return {
          data: tablas.claim ?? [{ ganador: true, estado_turno: "pagado" }],
          error: null,
        };
      }

      return { data: null, error: { message: "rpc desconocido" } };
    },
  } as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("cancelarTurno",
() =>
{
  it("debería reembolsar y cancelar un pagado fuera de retención",
  async () =>
  {
    stubAdmin({ turno: turnoPagado() });
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockResolvedValueOnce({ refundId: "refund-1" });

    const resultado = await cancelarTurno({ turnoId: "t-1", actor: "cliente" });

    expect(resultado).toMatchObject({ estado: "cancelado", reembolso: "devuelta" });
    expect(refundSpy).toHaveBeenCalledWith("neg-1", "pay-1", expect.stringContaining("t-1"));
  });

  it("debería cancelar sin reembolso un confirmado (sin cobro online)",
  async () =>
  {
    stubAdmin({ turno: turnoPagado({ estado: "confirmado", mp_payment_id: null }) });
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");

    const resultado = await cancelarTurno({ turnoId: "t-1", actor: "cliente" });

    expect(resultado).toMatchObject({ estado: "cancelado", reembolso: "no_aplica" });
    expect(refundSpy).not.toHaveBeenCalled();
  });

  it("debería retener la seña dentro de la ventana (cancela igual)",
  async () =>
  {
    stubAdmin({
      turno: turnoPagado({ inicio: new Date(Date.now() + 2 * 3_600_000).toISOString() }),
      negocio: { sena_retencion_hs: 72 },
    });
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");

    const resultado = await cancelarTurno({ turnoId: "t-1", actor: "cliente" });

    expect(resultado).toMatchObject({ estado: "cancelado", reembolso: "retenida" });
    expect(refundSpy).not.toHaveBeenCalled();
  });

  it("debería lanzar 409 cuando el turno ya está cerrado",
  async () =>
  {
    stubAdmin({ turno: turnoPagado({ estado: "cancelado" }) });

    await expect(cancelarTurno({ turnoId: "t-1", actor: "cliente" }))
      .rejects.toMatchObject({ codigo: "ya_cerrado" });
  });

  it("debería lanzar 404 sin turno",
  async () =>
  {
    stubAdmin({ turno: null });

    await expect(cancelarTurno({ turnoId: "t-x", actor: "cliente" }))
      .rejects.toMatchObject({ codigo: "no_encontrado" });
  });

  it("debería lanzar 500 (no 404) cuando la lectura falla (ej. columna sin migrar)",
  async () =>
  {
    stubAdmin({
      turno: null,
      turnoError: { code: "42703", message: "column turnos.sena_reembolsada does not exist" },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(cancelarTurno({ turnoId: "t-1", actor: "cliente" }))
      .rejects.toMatchObject({ codigo: "cancelacion_fallida", status: 500 });
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("debería no llamar dos veces a MP en doble cancelación paralela (claim)",
  async () =>
  {
    stubAdmin({
      turno: turnoPagado(),
      claim: [{ ganador: true, estado_turno: "pagado" }],
    });
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockResolvedValue({ refundId: "refund-1" });

    const [primero, segundo] = await Promise.allSettled([
      cancelarTurno({ turnoId: "t-1", actor: "cliente" }),
      cancelarTurno({ turnoId: "t-1", actor: "cliente", reclamoExistente: true }),
    ]);

    expect(primero.status).toBe("fulfilled");
    expect(segundo.status).toBe("rejected");
    expect(refundSpy).toHaveBeenCalledTimes(1);
  });

  it("debería cancelar igual cuando MP falla (reintentable, con evento)",
  async () =>
  {
    const auditoria = { updates: [] as unknown[], inserts: [] as unknown[] };
    stubAdmin({ turno: turnoPagado() }, auditoria);
    const refundSpy = vi.spyOn(paymentService, "refundForNegocio");
    refundSpy.mockRejectedValueOnce(new Error("mp caído"));

    const resultado = await cancelarTurno({ turnoId: "t-1", actor: "duenio" });

    expect(resultado).toMatchObject({ estado: "cancelado", reembolso: "fallido_reintentable" });
    expect(auditoria.inserts).toContainEqual(expect.objectContaining({
      tabla: "turno_eventos",
    }));
  });
});
