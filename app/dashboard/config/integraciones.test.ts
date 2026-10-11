import { beforeEach, describe, expect, it, vi } from "vitest";

import
{
  confirmarEliminacionNegocio,
  desconectarGoogleCalendar,
  desconectarMercadoPago,
  solicitarEliminacionNegocio,
} from "./actions";
import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import
{
  firmarTokenEliminacion,
  hashCodigoEliminacion,
  MINUTOS_VIGENCIA_CODIGO,
} from "@/lib/negocios/eliminacion";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
});

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertDuenoEditable: vi.fn(), assertModoEditable: vi.fn() };
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

const mockAssert = vi.mocked(assertModoEditable);
const mockAssertDueno = vi.mocked(assertDuenoEditable);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockNegocio = vi.mocked(getNegocioIdDelDueno);

const SECRETO_TEST = "secreto-eliminacion-test-1234567890";

/** Sesión de dueño con email (flujo de eliminación). */
function sesionDuenoConEmail(signOut = vi.fn(async () => ({}))): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1", email: "dueno@ejemplo.com" } } }),
      signOut,
    },
  } as never);
  mockNegocio.mockResolvedValue("neg-1");
}

/** Sesión de dueño sin email (user mínimo). */
function sesionDueno(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
  mockNegocio.mockResolvedValue("neg-1");
}

/**
 * Stub del admin para integraciones y borrado en cascada.
 *
 * @param tablas Filas para select().single().
 * @param error Error de update/delete/upsert o null.
 * @param auditor Tablas tocadas por delete() y valores de update/upsert.
 * @param failTables Si se indica, el error solo aplica a estas tablas.
 */
function stubIntegraciones(
  tablas: Record<string, unknown> = {},
  error: { message?: string } | null = null,
  auditor: { deletes?: string[]; updates?: unknown[]; upserts?: unknown[] } = {},
  failTables?: string[],
)
{
  const errorFor = (tabla: string): { message?: string } | null =>
    failTables === undefined ? error : (failTables.includes(tabla) ? error : null);

  const admin = {
    from: vi.fn((tabla: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: async () => ({ data: Array.isArray(tablas[tabla]) ? tablas[tabla] : [] }),
          })),
          single: async () => ({ data: tablas[tabla] ?? null }),
        })),
      })),
      update: vi.fn((values: unknown) =>
      {
        auditor.updates?.push(values);

        return { eq: vi.fn(async () => ({ error: errorFor(tabla) })) };
      }),
      delete: vi.fn(() =>
      {
        auditor.deletes?.push(tabla);

        return { eq: vi.fn(async () => ({ error: errorFor(tabla) })) };
      }),
      upsert: vi.fn(async (values: unknown) =>
      {
        auditor.upserts?.push(values);

        return { error: errorFor(tabla) };
      }),
    })),
    auth: { admin: { deleteUser: vi.fn(async () => ({})) } },
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("desconectarMercadoPago",
() =>
{
  it("debería nular los tokens del negocio sin señas activas",
  async () =>
  {
    sesionDueno();
    const auditor: { updates?: unknown[] } = { updates: [] };
    stubIntegraciones({ negocios: { id: "neg-1" } }, null, auditor);

    await desconectarMercadoPago();

    expect(auditor.updates).toEqual([{
      mercadopago_access_token: null,
      mercadopago_refresh_token: null,
    }]);
  });

  it("debería bloquear con servicios con seña activa",
  async () =>
  {
    sesionDueno();
    const auditor: { updates?: unknown[] } = { updates: [] };
    stubIntegraciones({ negocios: { id: "neg-1" }, servicios: [{ id: "serv-1" }] }, null, auditor);

    await expect(desconectarMercadoPago())
      .rejects.toThrow("Tenés servicios con seña activa. Desactivalas primero en Servicios.");
    expect(auditor.updates ?? []).toHaveLength(0);
  });

  it("debería bloquear al dueño demo",
  async () =>
  {
    sesionDueno();
    mockAssertDueno.mockImplementationOnce(() =>
    {
      throw new Error("La cuenta demo es de solo lectura.");
    });
    stubIntegraciones({ negocios: { id: "neg-1" } });

    await expect(desconectarMercadoPago())
      .rejects.toThrow("La cuenta demo es de solo lectura.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(desconectarMercadoPago())
      .rejects.toThrow("Tenés que iniciar sesión para desconectar MercadoPago.");
  });

  it("debería exigir negocio del dueño",
  async () =>
  {
    sesionDueno();
    stubIntegraciones({ negocios: null });

    await expect(desconectarMercadoPago()).rejects.toThrow("No encontramos tu negocio.");
  });

  it("debería lanzar cuando el update falla",
  async () =>
  {
    sesionDueno();
    stubIntegraciones({ negocios: { id: "neg-1" } }, {});

    await expect(desconectarMercadoPago())
      .rejects.toThrow("No pudimos desconectar MercadoPago. Probá de nuevo.");
  });
});

describe("desconectarGoogleCalendar",
() =>
{
  it("debería nular los secretos de Google",
  async () =>
  {
    sesionDueno();
    const auditor: { updates?: unknown[] } = { updates: [] };
    stubIntegraciones({ negocios: { id: "neg-1" } }, null, auditor);

    await desconectarGoogleCalendar();

    expect(auditor.updates).toEqual([{
      google_refresh_token: null,
      google_email: null,
      google_conectado_at: null,
    }]);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(desconectarGoogleCalendar())
      .rejects.toThrow("Tenés que iniciar sesión para desconectar Google.");
  });

  it("debería exigir negocio del dueño",
  async () =>
  {
    sesionDueno();
    stubIntegraciones({ negocios: null });

    await expect(desconectarGoogleCalendar()).rejects.toThrow("No encontramos tu negocio.");
  });

  it("debería lanzar cuando el update falla",
  async () =>
  {
    sesionDueno();
    stubIntegraciones({ negocios: { id: "neg-1" } }, {});

    await expect(desconectarGoogleCalendar())
      .rejects.toThrow("No pudimos desconectar Google. Probá de nuevo.");
  });
});

describe("solicitarEliminacionNegocio",
() =>
{
  it("debería enviar el código y devolver token + email enmascarado",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    mockEmailSend.mockResolvedValueOnce("email-1");
    stubIntegraciones({ negocios: { nombre: "Barbería" } });

    const result = await solicitarEliminacionNegocio();

    expect(typeof result.token).toBe("string");
    expect(result.emailEnmascarado).toBe("d***@ejemplo.com");
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      to: "dueno@ejemplo.com",
      fromName: "TurnoMas",
    }));
  });

  it("debería exigir email de sesión",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDueno();
    stubIntegraciones({ negocios: { nombre: "Barbería" } });

    await expect(solicitarEliminacionNegocio())
      .rejects.toThrow("Tenés que iniciar sesión para eliminar tu negocio.");
  });

  it("debería exigir el secreto de eliminación",
  async () =>
  {
    sesionDuenoConEmail();
    stubIntegraciones({ negocios: { nombre: "Barbería" } });

    await expect(solicitarEliminacionNegocio())
      .rejects.toThrow("Falta configurar el secreto de eliminación en el entorno.");
  });

  it("debería usar nombre genérico sin nombre tipado",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    mockEmailSend.mockResolvedValueOnce("email-2");
    stubIntegraciones({ negocios: { nombre: 123 } });

    const result = await solicitarEliminacionNegocio();

    expect(result.emailEnmascarado).toBe("d***@ejemplo.com");
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("tu negocio") as string,
    }));
  });
});

describe("confirmarEliminacionNegocio",
() =>
{
  /** Token válido firmado para el dueño y negocio de prueba. */
  function tokenValido(secreto: string = SECRETO_TEST): string
  {
    return firmarTokenEliminacion({
      negocioId: "neg-1",
      email: "dueno@ejemplo.com",
      codigoHash: hashCodigoEliminacion("123456"),
      exp: Date.now() + MINUTOS_VIGENCIA_CODIGO * 60_000,
    }, secreto);
  }

  it("debería borrar en cascada y desloguear",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    const signOut = vi.fn(async () => ({}));
    sesionDuenoConEmail(signOut);
    const auditor: { deletes?: string[] } = { deletes: [] };
    stubIntegraciones({}, null, auditor);

    await confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR");

    expect(auditor.deletes).toEqual(expect.arrayContaining(
      ["turnos", "clientes", "servicios", "staff", "negocio_secretos", "negocios"]));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("debería rechazar texto de confirmación inválido",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    stubIntegraciones({});

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "BORRAR"))
      .rejects.toThrow("Escribí ELIMINAR para confirmar.");
  });

  it("debería rechazar tokens inválidos",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    stubIntegraciones({});

    await expect(confirmarEliminacionNegocio("token-roto", "123456", "ELIMINAR")).rejects.toThrow();
  });

  it("debería rechazar códigos que no coinciden",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    stubIntegraciones({});

    await expect(confirmarEliminacionNegocio(tokenValido(), "000000", "ELIMINAR"))
      .rejects.toThrow("El código no coincide. Revisá tu email e intentá de nuevo.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);
    stubIntegraciones({});

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR"))
      .rejects.toThrow("Tenés que iniciar sesión para eliminar tu negocio.");
  });

  it("debería rechazar códigos enviados a otro email",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1", email: "otro@ejemplo.com" } } }),
        signOut: vi.fn(async () => ({})),
      },
    } as never);
    stubIntegraciones({});

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR"))
      .rejects.toThrow("Ese código se envió a otro email. Pedí uno nuevo.");
  });

  it("debería rechazar códigos de otro negocio",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    mockNegocio.mockResolvedValue("neg-otro");
    stubIntegraciones({});

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR"))
      .rejects.toThrow("Ese código no corresponde a tu negocio. Pedí uno nuevo.");
  });

  it("debería lanzar cuando el borrado de turnos falla",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    stubIntegraciones({}, {});

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR"))
      .rejects.toThrow("No pudimos eliminar tu negocio. Probá de nuevo.");
  });

  it("debería lanzar cuando el borrado de relacionados falla",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    stubIntegraciones({}, {}, {}, ["clientes"]);

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR"))
      .rejects.toThrow("No pudimos eliminar tu negocio. Probá de nuevo.");
  });

  it("debería lanzar cuando el borrado final falla",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    sesionDuenoConEmail();
    stubIntegraciones({}, {}, {}, ["negocio_secretos"]);

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR"))
      .rejects.toThrow("No pudimos eliminar tu negocio. Probá de nuevo.");
  });

  it("debería desloguear aunque el borrado del usuario falle",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    const signOut = vi.fn(async () => ({}));
    sesionDuenoConEmail(signOut);
    const admin = stubIntegraciones({}, null, {});
    vi.mocked(admin.auth.admin.deleteUser).mockRejectedValueOnce(new Error("auth caído"));

    await expect(confirmarEliminacionNegocio(tokenValido(), "123456", "ELIMINAR"))
      .resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalledOnce();
  });
});

describe("eliminación integración",
() =>
{
  it("debería solicitar y confirmar punta a punta",
  async () =>
  {
    vi.stubEnv("ELIMINACION_SECRET", SECRETO_TEST);
    const signOut = vi.fn(async () => ({}));
    sesionDuenoConEmail(signOut);
    mockEmailSend.mockResolvedValueOnce("email-1");
    const auditor: { deletes?: string[] } = { deletes: [] };
    stubIntegraciones({ negocios: { nombre: "Barbería" } }, null, auditor);

    const solicitud = await solicitarEliminacionNegocio();

    expect(solicitud.emailEnmascarado).toBe("d***@ejemplo.com");

    const codigoHash = hashCodigoEliminacion("654321");
    const { verificarTokenEliminacion } = await import("@/lib/negocios/eliminacion");
    const payload = verificarTokenEliminacion(solicitud.token, SECRETO_TEST);

    expect(payload.negocioId).toBe("neg-1");

    const tokenPropio = firmarTokenEliminacion({
      negocioId: payload.negocioId,
      email: payload.email,
      codigoHash,
      exp: Date.now() + MINUTOS_VIGENCIA_CODIGO * 60_000,
    }, SECRETO_TEST);

    await confirmarEliminacionNegocio(tokenPropio, "654321", "ELIMINAR");

    expect(auditor.deletes).toContain("turnos");
    expect(signOut).toHaveBeenCalledOnce();
  });
});
