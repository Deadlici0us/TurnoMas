import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import
{
  enviarEmailConfirmacion,
  formatearFechaEnZona,
  sincronizarTurnoConfirmado,
} from "@/lib/reservas/confirmacion";
import { calendarService } from "@/lib/services/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const { mockEmailSend } = vi.hoisted(() =>
{
  return { mockEmailSend: vi.fn() };
});

vi.mock("@/lib/ports/email", () =>
{
  return {
    ResendAdapter: function ()
    {
      return { send: mockEmailSend };
    },
  };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);

/**
 * Stub admin con update encadenable.
 *
 * @return Cliente admin mínimo.
 */
function stubAdmin()
{
  const query: Record<string, unknown> = {};

  query.eq = () => query;
  query.then = (resolve: (value: unknown) => unknown) => resolve({ error: null });

  return { from: () => ({ update: () => query }) } as never;
}

const PARAMS_BASE = {
  negocioId: "neg-1",
  negocioNombre: "Barbería",
  servicioNombre: "Corte",
  staffNombre: "Diego",
  clienteId: "cli-1",
  clienteNombre: "Juan",
  whatsapp: "+549110000001",
  email: "juan@ejemplo.com",
  inicio: new Date("2026-10-06T13:00:00.000Z"),
  fin: new Date("2026-10-06T13:30:00.000Z"),
  turnoId: "t-1",
  timeZone: "America/Argentina/Buenos_Aires",
  plantillaSubject: null,
  plantillaCuerpo: null,
} as const;

beforeEach(() =>
{
  vi.clearAllMocks();
  mockAdmin.mockReturnValue(stubAdmin());
});

afterEach(() =>
{
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("formatearFechaEnZona",
() =>
{
  it("debería formatear DD/MM/YYYY HH:mm en la zona del negocio",
  () =>
  {
    expect(formatearFechaEnZona(new Date("2026-10-06T13:00:00.000Z"), "America/Argentina/Buenos_Aires"))
      .toBe("06/10/2026 10:00");
  });
});

describe("sincronizarTurnoConfirmado",
() =>
{
  it("debería crear el evento y reportar el email enviado",
  async () =>
  {
    vi.spyOn(calendarService, "createEventForNegocio").mockResolvedValue("evt-1");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    vi.stubEnv("CANCELACION_SECRET", "secreto-suficientemente-largo");
    mockEmailSend.mockResolvedValueOnce("email-1");

    await expect(sincronizarTurnoConfirmado(PARAMS_BASE))
      .resolves.toEqual({ enviado: true, motivo: "enviado" });

    expect(calendarService.createEventForNegocio).toHaveBeenCalled();
    expect(mockEmailSend).toHaveBeenCalledTimes(1);
  });

  it("debería usar el asunto default cuando no hay plantilla propia",
  async () =>
  {
    vi.spyOn(calendarService, "createEventForNegocio").mockResolvedValue(null);
    mockEmailSend.mockResolvedValueOnce("email-1");

    await sincronizarTurnoConfirmado(PARAMS_BASE);

    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      subject: "Reserva confirmada en Barbería",
    }));
  });

  it("debería usar la variante con seña y link de pago cuando el turno está pendiente",
  async () =>
  {
    mockEmailSend.mockResolvedValueOnce("email-1");

    await enviarEmailConfirmacion({
      ...PARAMS_BASE,
      email: "juan@ejemplo.com",
      estado: "pendiente",
      checkoutUrl: "https://mp.turnomas.com/pagar/t-1",
    });

    const payload = mockEmailSend.mock.calls[0]?.[0] as { subject: string; html: string };

    expect(payload.subject).toBe("Tu reserva en Barbería está casi lista");
    expect(payload.html).toContain("Pagá tu seña acá:");
    expect(payload.html).toContain("https://mp.turnomas.com/pagar/t-1");
  });

  it("debería no enviar email cuando el cliente no tiene",
  async () =>
  {
    vi.spyOn(calendarService, "createEventForNegocio").mockResolvedValue(null);

    await expect(sincronizarTurnoConfirmado({ ...PARAMS_BASE, email: null }))
      .resolves.toEqual({ enviado: false, motivo: "sin_email" });

    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it("debería reportar el fallo del email y loguearlo sin romper",
  async () =>
  {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(calendarService, "createEventForNegocio").mockRejectedValueOnce(new Error("gcal caído"));
    mockEmailSend.mockRejectedValueOnce(new Error("email caído"));

    await expect(sincronizarTurnoConfirmado(PARAMS_BASE))
      .resolves.toEqual({ enviado: false, motivo: "error" });

    expect(errorSpy).toHaveBeenCalled();
  });
});
