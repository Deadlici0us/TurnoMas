import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { paymentService } from "@/lib/services/payment";
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

const { mockQstashSchedule, mockEmailSend } = vi.hoisted(() =>
{
  return { mockQstashSchedule: vi.fn(), mockEmailSend: vi.fn() };
});

vi.mock("@/lib/ports/jobs", () =>
{
  return {
    QStashAdapter: function ()
    {
      return { schedule: mockQstashSchedule };
    },
  };
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

const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

function requestWith(body: unknown): Request
{
  return new Request("http://localhost/api/reservas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BASE = {
  pais: "ar",
  slug: "barberia-diego",
  staffId: "d0e6b000-0000-4000-8000-000000000011",
  servicioId: "d0e6b000-0000-4000-8000-000000000021",
  inicio: new Date(Date.now() + 86_400_000).toISOString(),
  nombre: "Juan Pérez",
  whatsapp: "+549110000001",
  email: "cli@ejemplo.com",
};

const NEGOCIO_PORTAL = { id: "neg-1", nombre: "Barbería", pais: "ar", slug: "barberia-diego" };
const STAFF = { id: "staff-1", nombre: "Diego", horarios: {} };

function servicioFixture(overrides: Record<string, unknown> = {})
{
  return {
    id: "serv-1",
    nombre: "Corte",
    duracion_min: 30,
    precio_base: 10000,
    precio_promocional: null,
    sena_requerida: false,
    sena_porcentaje: 0,
    ...overrides,
  };
}

function negocioFullFixture(overrides: Record<string, unknown> = {})
{
  return {
    id: "neg-1",
    blacklist_umbral: 2,
    blacklist_penalidad: "fullDeposit",
    timezone: "America/Argentina/Buenos_Aires",
    pais: "ar",
    resena_activa: false,
    recordatorio_activo: false,
    msg_confirmacion_subject: null,
    msg_confirmacion_cuerpo: null,
    ...overrides,
  };
}

interface ReservasTablas
{
  readonly portalNegocios?: unknown;
  readonly portalStaff?: unknown;
  readonly portalServicios?: unknown;
  readonly negocios?: unknown;
  readonly clientes?: unknown;
  readonly turnosRows?: unknown;
  readonly serviciosRows?: unknown;
  /** Filas de staff_servicios; por defecto permite el par (1 fila). */
  readonly staffServiciosRows?: unknown;
}

/**
 * Stub portal (server) con despacho por tabla.
 *
 * @param tablas Filas del portal.
 */
function stubPortal(tablas: ReservasTablas): void
{
  const tablaDe = (selectArgs: string): keyof ReservasTablas | null =>
  {
    if (selectArgs.includes("pais")) return "portalNegocios";

    if (selectArgs.includes("horarios")) return "portalStaff";

    if (selectArgs.includes("duracion_min") && selectArgs.includes("precio_base")) return "portalServicios";

    return null;
  };

  mockServer.mockResolvedValue({
    from: () => ({
      select: (cols: string) => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: tablas[tablaDe(cols) ?? "portalNegocios"] ?? null,
              error: null,
            }),
          }),
        }),
      }),
    }),
  } as never);
}

interface ReservasAdminOpts
{
  readonly tablas?: ReservasTablas;
  readonly insertResults?: Record<string, { data: unknown; error: { message: string } | null }>;
  readonly updateError?: { message: string } | null;
  readonly updates?: unknown[];
  readonly inserts?: unknown[];
}

/**
 * Stub admin con cadenas thenable para eq/gte/single.
 *
 * @param opts Tablas, resultados de insert y auditoría.
 */
function stubAdmin(opts: ReservasAdminOpts = {}): void
{
  const tablas = opts.tablas ?? {};
  const singleFor = (tabla: string): { data: unknown } =>
  {
    if (tabla === "negocios") return { data: tablas.negocios ?? null };

    if (tabla === "clientes") return { data: tablas.clientes ?? null };

    if (tabla === "turnos") return { data: null };

    return { data: null };
  };
  const listFor = (tabla: string): unknown[] =>
  {
    if (tabla === "turnos") return (tablas.turnosRows ?? []) as unknown[];

    if (tabla === "servicios") return (tablas.serviciosRows ?? []) as unknown[];

    // Por defecto el profesional sí ofrece el servicio (par permitido).
    if (tabla === "staff_servicios") return (tablas.staffServiciosRows ?? [{ staff_id: "staff-1" }]) as unknown[];

    return [];
  };

  /** Query builder genérico: encadenable (eq/gte/limit/…) y thenable. */
  const buildQuery = (tabla: string): Record<string, unknown> =>
  {
    const q: Record<string, unknown> = {};

    for (const metodo of ["eq", "gte", "lte", "gt", "lt", "in", "order", "limit", "select"])
    {
      q[metodo] = () => q;
    }

    q.single = async () => singleFor(tabla);
    q.maybeSingle = async () => singleFor(tabla);
    q.then = (resolve: (value: unknown) => unknown) => resolve({ data: listFor(tabla), error: null });

    return q;
  };

  mockAdmin.mockReturnValue({
    from: (tabla: string) => ({
      select: () => buildQuery(tabla),
      insert: (values: unknown) =>
      {
        opts.inserts?.push(values);
        const result = opts.insertResults?.[tabla] ?? { data: { id: "t-1" }, error: null };

        return { select: () => ({ single: async () => result }) };
      },
      update: (values: unknown) =>
      {
        opts.updates?.push(values);
        const updateQuery: Record<string, unknown> = {};
        updateQuery.eq = () => updateQuery;
        updateQuery.then = (resolve: (value: unknown) => unknown) =>
          resolve({ error: opts.updateError ?? null });

        return updateQuery;
      },
    }),
  } as never);
}

/** Portal y admin sanos para el flujo feliz confirmado. */
function flujoFeliz(overrides: { tablas?: ReservasTablas; servicio?: Record<string, unknown> } = {}): void
{
  stubPortal({
    portalNegocios: NEGOCIO_PORTAL,
    portalStaff: STAFF,
    portalServicios: servicioFixture(overrides.servicio),
  });
  stubAdmin({
    tablas: {
      negocios: negocioFullFixture(),
      clientes: null,
      turnosRows: [],
      serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
      ...overrides.tablas,
    },
  });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/reservas",
() =>
{
  it("debería exigir nombre en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, nombre: " " }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Contanos tu nombre para confirmar la reserva.");
  });

  it("debería exigir whatsapp válido en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, whatsapp: "abc" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Revisá tu WhatsApp para que te lleguen los recordatorios.");
  });

  it("debería exigir inicio futuro en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, inicio: "no-fecha" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Elegí un horario válido para tu reserva.");
  });

  it("debería exigir 30 min de anticipación en español",
  async () =>
  {
    const response = await POST(requestWith(
      { ...BASE, inicio: new Date(Date.now() + 10 * 60_000).toISOString() }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Elegí un horario con al menos 30 min de anticipación.");
  });

  it("debería exigir inicio de texto en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, inicio: 123 }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Elegí un horario válido para tu reserva.");
  });

  it("debería exigir email válido en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, email: "no-es-mail" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Revisá tu email para que te lleguen las confirmaciones.");
  });

  it("debería rechazar un email con llave antes de reservar",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, email: "flores.anibal.e@gmail.com}" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Revisá tu email para que te lleguen las confirmaciones.");
  });

  it("debería exigir email aunque el negocio no tenga avisos activos",
  async () =>
  {
    flujoFeliz({ tablas: { negocios: negocioFullFixture({ resena_activa: false, recordatorio_activo: false }) } });

    const response = await POST(requestWith({ ...BASE, email: null }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dejanos tu email para confirmar y avisarte.");
  });

  it("debería devolver 400 con cuerpo ilegible",
  async () =>
  {
    const request = new Request("http://localhost/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "esto-no-es-json{",
    });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("No pudimos leer tu reserva. Probá de nuevo.");
  });

  it("debería devolver 404 sin negocio",
  async () =>
  {
    stubPortal({ portalNegocios: null, portalStaff: STAFF, portalServicios: servicioFixture() });
    stubAdmin({});

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("No encontramos ese negocio.");
  });

  it("debería devolver 404 sin servicio disponible",
  async () =>
  {
    stubPortal({ portalNegocios: NEGOCIO_PORTAL, portalStaff: STAFF, portalServicios: null });
    stubAdmin({});

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Ese profesional o servicio ya no está disponible.");
  });

  it("debería devolver 404 cuando el profesional no ofrece el servicio",
  async () =>
  {
    stubPortal({ portalNegocios: NEGOCIO_PORTAL, portalStaff: STAFF, portalServicios: servicioFixture() });
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture(),
        clientes: null,
        turnosRows: [],
        serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
        staffServiciosRows: [],
      },
    });

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Ese profesional no ofrece ese servicio.");
  });

  it("debería rechazar 403 al cliente bloqueado por lista negra",
  async () =>
  {
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture(),
    });
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture({ blacklist_penalidad: "blocked" }),
        clientes: { id: "cli-0", ausencias: 5 },
      },
    });

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("debería devolver 409 con el horario ocupado",
  async () =>
  {
    const inicio = new Date(Date.now() + 86_400_000).toISOString();
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture(),
    });
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture(),
        clientes: null,
        turnosRows: [{
          inicio,
          servicio_id: "serv-1",
          estado: "confirmado",
          created_at: new Date().toISOString(),
        }],
        serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
      },
    });

    const response = await POST(requestWith({ ...BASE, inicio }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("Ese horario se acaba de ocupar. Elegí otro.");
  });

  it("debería devolver 500 cuando el cliente no se puede guardar",
  async () =>
  {
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture(),
    });
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture(),
        clientes: null,
        turnosRows: [],
        serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
      },
      insertResults: { clientes: { data: null, error: { message: "dup" } } },
    });

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("No pudimos guardar tu reserva. Probá de nuevo.");
  });

  it("debería devolver 500 cuando el turno no se puede guardar",
  async () =>
  {
    const inserts: unknown[] = [];
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture(),
    });
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture(),
        clientes: null,
        turnosRows: [],
        serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
      },
      insertResults: {
        clientes: { data: { id: "cli-1" }, error: null },
        turnos: { data: null, error: { message: "db" } },
      },
      inserts,
    });

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("No pudimos guardar tu reserva. Probá de nuevo.");
    expect(inserts).toHaveLength(2);
  });

  it("debería confirmar sin seña con email",
  async () =>
  {
    flujoFeliz();
    mockEmailSend.mockResolvedValue("email-1");

    const response = await POST(requestWith({ ...BASE, email: "cli@ejemplo.com" }));
    const body = await response.json() as {
      success: boolean; turnoId: string; montoTotal: number; checkoutUrl?: string;
      emailEnviado: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.turnoId).toBe("t-1");
    expect(body.montoTotal).toBe(10000);
    expect(body.checkoutUrl).toBeUndefined();
    expect(body.emailEnviado).toBe(true);
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "cli@ejemplo.com" }));
  });

  it("debería reutilizar el cliente existente por whatsapp",
  async () =>
  {
    const inserts: unknown[] = [];
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture(),
    });
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture(),
        clientes: { id: "cli-9", ausencias: 0 },
        turnosRows: [],
        serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
      },
      inserts,
    });

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ cliente_id: "cli-9" });
  });

  it("debería rechazar un email vacío",
  async () =>
  {
    flujoFeliz();

    const response = await POST(requestWith({ ...BASE, email: "   " }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dejanos tu email para confirmar y avisarte.");
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it("debería rechazar una reserva sin email",
  async () =>
  {
    flujoFeliz();

    const response = await POST(requestWith({ ...BASE, email: null }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dejanos tu email para confirmar y avisarte.");
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it("debería confirmar aunque el email falle (best-effort)",
  async () =>
  {
    flujoFeliz();
    mockEmailSend.mockRejectedValueOnce(new Error("resend caído"));

    const response = await POST(requestWith({ ...BASE, email: "cli@ejemplo.com" }));
    const body = await response.json() as { success: boolean; emailEnviado: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.emailEnviado).toBe(false);
  });

  it("debería loguear advertencias del portal sin bloquear",
  async () =>
  {
    const portal: Record<string, unknown> = {
      negocios: NEGOCIO_PORTAL,
      staff: STAFF,
      servicios: servicioFixture(),
    };
    mockServer.mockResolvedValue({
      from: () => ({
        select: (cols: string) => ({
          eq: () => ({
            eq: () => ({
              single: async () =>
              {
                const key = cols.includes("pais")
                  ? "negocios"
                  : (cols.includes("horarios") ? "staff" : "servicios");

                return { data: portal[key] ?? null, error: { message: "warn" } };
              },
            }),
          }),
        }),
      }),
    } as never);
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture(),
        clientes: null,
        turnosRows: [],
        serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
      },
    });

    const response = await POST(requestWith(BASE));

    expect(response.status).toBe(200);
  });

  it("debería crear checkout con seña y programar antifantasma",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    flujoFeliz({ servicio: { sena_requerida: true, sena_porcentaje: 50 } });
    const prefSpy = vi.spyOn(paymentService, "createDepositPreferenceForNegocio");
    prefSpy.mockResolvedValue({ id: "pref-1", initPoint: "https://pay/x", amountCents: 5000 });
    mockQstashSchedule.mockResolvedValue("job-1");

    const response = await POST(requestWith(BASE));
    const body = await response.json() as {
      success: boolean; senaMonto: number; checkoutUrl: string | null; checkoutError: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.senaMonto).toBe(5000);
    expect(body.checkoutUrl).toBe("https://pay/x");
    expect(body.checkoutError).toBeNull();
    expect(mockQstashSchedule).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://app.turnomas.com/api/cron/antifantasma",
      delaySeconds: 900,
    }));
  });

  it("debería reservar aunque el antifantasma falle (best-effort)",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    flujoFeliz({ servicio: { sena_requerida: true, sena_porcentaje: 50 } });
    const prefSpy = vi.spyOn(paymentService, "createDepositPreferenceForNegocio");
    prefSpy.mockResolvedValue({ id: "pref-1", initPoint: "https://pay/x", amountCents: 5000 });
    mockQstashSchedule.mockRejectedValueOnce(new Error("qstash caído"));

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { success: boolean; checkoutUrl: string | null };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.checkoutUrl).toBe("https://pay/x");
  });

  it("debería enviar email con link de pago y cancelación en reserva con seña",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    vi.stubEnv("CANCELACION_SECRET", "secreto-test-cancelacion-largo");
    flujoFeliz({ servicio: { sena_requerida: true, sena_porcentaje: 50 } });
    const prefSpy = vi.spyOn(paymentService, "createDepositPreferenceForNegocio");
    prefSpy.mockResolvedValue({ id: "pref-1", initPoint: "https://pay/x", amountCents: 5000 });
    mockQstashSchedule.mockResolvedValue("job-1");
    mockEmailSend.mockResolvedValue("email-1");

    const response = await POST(requestWith({ ...BASE, email: "cli@ejemplo.com" }));
    const body = await response.json() as { success: boolean; emailEnviado: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.emailEnviado).toBe(true);
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "cli@ejemplo.com" }));
    const html = mockEmailSend.mock.calls[0]?.[0]?.html as string;

    expect(html).toContain("https://pay/x");
    expect(html).toContain("/cancelar/t-1?token=");
  });

  it("debería reservar con seña aunque el email falle (best-effort)",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    vi.stubEnv("CANCELACION_SECRET", "secreto-test-cancelacion-largo");
    flujoFeliz({ servicio: { sena_requerida: true, sena_porcentaje: 50 } });
    const prefSpy = vi.spyOn(paymentService, "createDepositPreferenceForNegocio");
    prefSpy.mockResolvedValue({ id: "pref-1", initPoint: "https://pay/x", amountCents: 5000 });
    mockQstashSchedule.mockResolvedValue("job-1");
    mockEmailSend.mockRejectedValueOnce(new Error("resend caído"));

    const response = await POST(requestWith({ ...BASE, email: "cli@ejemplo.com" }));
    const body = await response.json() as { success: boolean; emailEnviado: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.emailEnviado).toBe(false);
  });

  it("debería responder checkoutError cuando MercadoPago falla",
  async () =>
  {
    flujoFeliz({ servicio: { sena_requerida: true, sena_porcentaje: 50 } });
    const prefSpy = vi.spyOn(paymentService, "createDepositPreferenceForNegocio");
    prefSpy.mockRejectedValue(new Error("mp caído"));

    const response = await POST(requestWith(BASE));
    const body = await response.json() as {
      success: boolean; checkoutUrl: string | null; checkoutError: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.checkoutUrl).toBeNull();
    expect(body.checkoutError).toBe("No pudimos generar el link de pago. Probá de nuevo en unos segundos.");
  });

  it("debería responder sinMp cuando el negocio no conectó MercadoPago",
  async () =>
  {
    const { NegocioSinMpError } = await import("@/lib/payments/mp-token");
    flujoFeliz({ servicio: { sena_requerida: true, sena_porcentaje: 50 } });
    const prefSpy = vi.spyOn(paymentService, "createDepositPreferenceForNegocio");
    prefSpy.mockRejectedValue(new NegocioSinMpError());

    const response = await POST(requestWith(BASE));
    const body = await response.json() as {
      success: boolean; checkoutUrl: string | null; checkoutError: string | null; sinMp: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.checkoutUrl).toBeNull();
    expect(body.sinMp).toBe(true);
    expect(body.checkoutError).toBe("Este negocio aún no activó el cobro online. Tu reserva quedó pendiente.");
  });


  it("debería devolver 503 sin Supabase disponible",
  async () =>
  {
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture(),
    });
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("Falta configurar Supabase en el entorno.");
    });

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Reserva no disponible temporalmente.");
  });

  it("debería devolver 500 ante errores inesperados",
  async () =>
  {
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture(),
    });
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("boom");
    });

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("No pudimos guardar tu reserva. Probá de nuevo.");
  });
});

describe("POST /api/reservas integración",
() =>
{
  it("debería reservar con seña punta a punta",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    const inserts: unknown[] = [];
    stubPortal({
      portalNegocios: NEGOCIO_PORTAL,
      portalStaff: STAFF,
      portalServicios: servicioFixture({ sena_requerida: true, sena_porcentaje: 50 }),
    });
    stubAdmin({
      tablas: {
        negocios: negocioFullFixture(),
        clientes: null,
        turnosRows: [],
        serviciosRows: [{ id: "serv-1", duracion_min: 30 }],
      },
      inserts,
    });
    const prefSpy = vi.spyOn(paymentService, "createDepositPreferenceForNegocio");
    prefSpy.mockResolvedValue({ id: "pref-int", initPoint: "https://pay/int", amountCents: 5000 });
    mockQstashSchedule.mockResolvedValue("job-int");

    const response = await POST(requestWith(BASE));
    const body = await response.json() as { success: boolean; turnoId: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, turnoId: "t-1" });
    expect(inserts).toHaveLength(2);
    expect(prefSpy).toHaveBeenCalledWith("neg-1", "t-1", 10000, 50, "Seña Barbería");
  });
});
