import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentService } from "./payment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const { mockCreatePreference, mockRefund } = vi.hoisted(() =>
{
  return { mockCreatePreference: vi.fn(), mockRefund: vi.fn() };
});

vi.mock("@/lib/adapters/mercadopago", () =>
{
  return {
    MercadoPagoAdapter: function ()
    {
      return { createDepositPreference: mockCreatePreference, refundPayment: mockRefund };
    },
  };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

/**
 * Arma el stub de `negocio_secretos` para `getBusinessAccessToken`.
 *
 * @param data Fila devuelta por `.single()`.
 * @return Doble de admin con cadena `from/select/eq/single`.
 */
function stubSecretos(data: unknown)
{
  const single = vi.fn(async () => ({ data }));

  const admin = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single })),
      })),
    })),
  };

  mockGetSupabaseAdmin.mockReturnValue(admin as never);

  return { admin, single };
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PaymentService.createDepositPreference",
() =>
{
  it("debería delegar en el negocio null con el token de plataforma",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    mockCreatePreference.mockResolvedValueOnce({ id: "pref-1", checkoutUrl: "https://pay/1", amountCents: 5000 });

    const service = new PaymentService();
    const result = await service.createDepositPreference("book-1", 10000, 50, "Seña turno");

    expect(result).toEqual({ id: "pref-1", initPoint: "https://pay/1", amountCents: 5000 });
    expect(mockCreatePreference).toHaveBeenCalledWith(expect.objectContaining({
      bookingId: "book-1",
      accessToken: "APP_USR-platform",
    }));
  });
});

describe("PaymentService.createDepositPreferenceForNegocio",
() =>
{
  it("debería usar el token del negocio cuando está conectado",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    stubSecretos({ mercadopago_access_token: "APP_USR-negocio" });
    mockCreatePreference.mockResolvedValueOnce({ id: "pref-2", checkoutUrl: "https://pay/2", amountCents: 2000 });

    const service = new PaymentService();
    await service.createDepositPreferenceForNegocio("neg-1", "book-2", 4000, 50, "Seña");

    expect(mockCreatePreference).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "APP_USR-negocio" }));
  });

  it("debería caer a la plataforma sin token del negocio",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    stubSecretos({ mercadopago_access_token: null });
    mockCreatePreference.mockResolvedValueOnce({ id: "pref-3", checkoutUrl: "https://pay/3", amountCents: 1000 });

    const service = new PaymentService();
    await service.createDepositPreferenceForNegocio("neg-1", "book-3", 2000, 50, "Seña");

    expect(mockCreatePreference).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "APP_USR-platform" }));
  });
});

describe("PaymentService.getBusinessAccessToken",
() =>
{
  it("debería devolver el token del negocio",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    stubSecretos({ mercadopago_access_token: "APP_USR-negocio" });

    await expect(new PaymentService().getBusinessAccessToken("neg-1")).resolves.toBe("APP_USR-negocio");
  });

  it("debería caer a la plataforma cuando el negocio no conectó",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    stubSecretos(null);

    await expect(new PaymentService().getBusinessAccessToken("neg-1")).resolves.toBe("APP_USR-platform");
  });

  it("debería caer a la plataforma ante errores de Supabase",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    mockGetSupabaseAdmin.mockImplementation(() =>
    {
      throw new Error("supabase caído");
    });

    await expect(new PaymentService().getBusinessAccessToken("neg-1")).resolves.toBe("APP_USR-platform");
  });

  it("debería devolver null sin ningún token",
  async () =>
  {
    stubSecretos(null);

    await expect(new PaymentService().getBusinessAccessToken("neg-1")).resolves.toBeNull();
  });
});

describe("PaymentService.refund",
() =>
{
  it("debería reembolsar directo por paymentId",
  async () =>
  {
    mockRefund.mockResolvedValueOnce(undefined);

    await new PaymentService().refundPayment("pay-1", 5000);

    expect(mockRefund).toHaveBeenCalledWith("pay-1");
  });

  it("debería reembolsar con el token del negocio",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    stubSecretos({ mercadopago_access_token: "APP_USR-negocio" });
    mockRefund.mockResolvedValueOnce(undefined);

    await new PaymentService().refundForNegocio("neg-1", "pay-2");

    expect(mockRefund).toHaveBeenCalledWith("pay-2", "APP_USR-negocio");
  });
});

describe("PaymentService.getPaymentStatus",
() =>
{
  it("debería mapear estado y referencia externa",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "pay-1", status: "approved", external_reference: "book-1" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new PaymentService().getPaymentStatus("pay-1");

    expect(result).toEqual({ id: "pay-1", status: "approved", externalReference: "book-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/pay-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("debería devolver null cuando la referencia no es string",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "pay-1", status: "pending", external_reference: 123 }),
    })));

    const result = await new PaymentService().getPaymentStatus("pay-1");

    expect(result.externalReference).toBeNull();
  });

  it("debería preferir el token explícito sobre el entorno",
  async () =>
  {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "pay-1", status: "approved", external_reference: null }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await new PaymentService().getPaymentStatus("pay-1", "APP_USR-explicito");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { Authorization: "Bearer APP_USR-explicito" } }),
    );
  });

  it("debería lanzar sin token configurado",
  async () =>
  {
    await expect(new PaymentService().getPaymentStatus("pay-1", null))
      .rejects.toThrow("El negocio aún no conectó MercadoPago");
  });

  it("debería lanzar cuando MercadoPago responde no-ok",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));

    await expect(new PaymentService().getPaymentStatus("pay-1"))
      .rejects.toThrow("No se pudo consultar el estado del pago: 404");
  });
});

describe("PaymentService integración",
() =>
{
  it("debería crear la seña del negocio punta a punta con adapter mockeado",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    stubSecretos({ mercadopago_access_token: "APP_USR-negocio" });
    mockCreatePreference.mockResolvedValueOnce({ id: "pref-int", checkoutUrl: "https://pay/int", amountCents: 3000 });

    const service = new PaymentService();
    const token = await service.getBusinessAccessToken("neg-1");
    const preference = await service.createDepositPreferenceForNegocio("neg-1", "book-int", 6000, 50, "Seña int");

    expect(token).toBe("APP_USR-negocio");
    expect(preference.id).toBe("pref-int");
    expect(mockCreatePreference).toHaveBeenCalledWith(expect.objectContaining({
      bookingId: "book-int",
      accessToken: "APP_USR-negocio",
    }));
  });
});
