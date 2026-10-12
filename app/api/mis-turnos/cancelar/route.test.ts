import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { cancelarTurno, CancelacionError, hashIp } from "@/lib/services/cancelacion";
import { verificarTokenCancelacion } from "@/lib/cancelacion/token";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
    hashIp: vi.fn(() => "iphash"),
  };
});

vi.mock("@/lib/cancelacion/token", () =>
{
  return { verificarTokenCancelacion: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockCancelar = vi.mocked(cancelarTurno);
const mockVerificar = vi.mocked(verificarTokenCancelacion);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockHashIp = vi.mocked(hashIp);

function requestCon(body: unknown, ip: string | null = "1.2.3.4"): Request
{
  const headers = new Headers({ "Content-Type": "application/json" });

  if (ip !== null)
  {
    headers.set("x-forwarded-for", ip);
  }

  return new Request("http://localhost/api/mis-turnos/cancelar", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() =>
{
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("CANCELACION_SECRET", "secreto-test-cancelacion");
  mockAdmin.mockReturnValue({
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  } as never);
});

describe("POST /api/mis-turnos/cancelar",
() =>
{
  it("debería cancelar con token válido y devolver el resultado",
  async () =>
  {
    mockVerificar.mockReturnValueOnce({ turnoId: "t-1", clienteId: "cli-1", exp: 123 });
    mockCancelar.mockResolvedValueOnce({
      estado: "cancelado", reembolso: "devuelta", horasRestantes: 100, retencionHs: 72,
    });

    const response = await POST(requestCon({ turnoId: "t-1", token: "tok" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, estado: "cancelado", reembolso: "devuelta" });
    expect(mockCancelar).toHaveBeenCalledWith(expect.objectContaining({
      turnoId: "t-1", actor: "cliente", ipHash: "iphash",
    }));
    expect(mockHashIp).toHaveBeenCalledWith("1.2.3.4");
  });

  it("debería devolver 400 sin turno o token",
  async () =>
  {
    const sinToken = await POST(requestCon({ turnoId: "t-1" }));

    expect(sinToken.status).toBe(400);

    const sinTurno = await POST(requestCon({ token: "tok" }));

    expect(sinTurno.status).toBe(400);
    expect(mockCancelar).not.toHaveBeenCalled();
  });

  it("debería devolver 401 con token inválido",
  async () =>
  {
    mockVerificar.mockImplementationOnce(() =>
    {
      throw new Error("El link de cancelación no es válido. Pedí uno nuevo.");
    });

    const response = await POST(requestCon({ turnoId: "t-1", token: "malo" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toContain("no es válido");
    expect(mockCancelar).not.toHaveBeenCalled();
  });

  it("debería propagar el 409 de doble cancelación",
  async () =>
  {
    mockVerificar.mockReturnValueOnce({ turnoId: "t-1", clienteId: "cli-1", exp: 123 });
    mockCancelar.mockRejectedValueOnce(new CancelacionError("ya_cerrado", "Ese turno ya está cerrado.", 409));

    const response = await POST(requestCon({ turnoId: "t-1", token: "tok" }));
    const body = await response.json() as { error: string; codigo: string };

    expect(response.status).toBe(409);
    expect(body.codigo).toBe("ya_cerrado");
    expect(body.error).toBe("Ese turno ya está cerrado.");
  });

  it("debería devolver 503 sin secreto configurado",
  async () =>
  {
    vi.stubEnv("CANCELACION_SECRET", "");

    const response = await POST(requestCon({ turnoId: "t-1", token: "tok" }));

    expect(response.status).toBe(503);
    expect(mockCancelar).not.toHaveBeenCalled();
  });

  it("debería devolver 400 con cuerpo ilegible",
  async () =>
  {
    const request = new Request("http://localhost/api/mis-turnos/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "esto-no-es-json{",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
