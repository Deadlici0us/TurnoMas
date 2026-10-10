import { beforeEach, describe, expect, it, vi } from "vitest";

import { MercadoPagoAdapter } from "./mercadopago";

function respuestaOk(json: unknown)
{
  return { ok: true, status: 200, json: async () => json };
}

function respuestaError(status: number)
{
  return { ok: false, status, json: async () => ({}) };
}

/** Instala fetch global mockeado y devuelve el mock. */
function instalarFetch(respuesta: unknown)
{
  const fetchMock = vi.fn(async () => respuesta);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("MercadoPagoAdapter.createDepositPreference",
() =>
{
  it("debería crear la preferencia con el token del negocio",
  async () =>
  {
    const fetchMock = instalarFetch(respuestaOk({ id: "pref-1", init_point: "https://pay/1" }));
    const adapter = new MercadoPagoAdapter();

    const result = await adapter.createDepositPreference({
      bookingId: "book-1",
      amountCents: 10000,
      percentage: 50,
      description: "Seña turno",
      accessToken: "APP_USR-negocio",
    });

    expect(result).toEqual({ id: "pref-1", checkoutUrl: "https://pay/1", amountCents: 5000 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/checkout/preferences",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer APP_USR-negocio" }),
      }),
    );
  });

  it("debería caer al token de plataforma sin token explícito",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    const fetchMock = instalarFetch(respuestaOk({ id: "pref-2", init_point: "https://pay/2" }));

    await new MercadoPagoAdapter().createDepositPreference({
      bookingId: "book-1",
      amountCents: 4000,
      percentage: 25,
      description: "Seña",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer APP_USR-platform" }),
      }),
    );
  });

  it("debería lanzar sin ningún token",
  async () =>
  {
    const adapter = new MercadoPagoAdapter();

    await expect(adapter.createDepositPreference({
      bookingId: "book-1",
      amountCents: 10000,
      percentage: 50,
      description: "Seña",
    })).rejects.toThrow("El negocio aún no conectó MercadoPago para cobrar señas.");
  });

  it("debería lanzar cuando MercadoPago responde no-ok",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    instalarFetch(respuestaError(400));

    await expect(new MercadoPagoAdapter().createDepositPreference({
      bookingId: "book-1",
      amountCents: 10000,
      percentage: 50,
      description: "Seña",
    })).rejects.toThrow("No se pudo crear la preferencia de pago en MercadoPago.");
  });

  it("debería lanzar con respuesta inválida",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    instalarFetch(respuestaOk({ sin_id: true }));

    await expect(new MercadoPagoAdapter().createDepositPreference({
      bookingId: "book-1",
      amountCents: 10000,
      percentage: 50,
      description: "Seña",
    })).rejects.toThrow("Respuesta inválida de MercadoPago al crear la seña.");
  });
});

describe("MercadoPagoAdapter.refundPayment",
() =>
{
  it("debería reembolsar con el token explícito",
  async () =>
  {
    const fetchMock = instalarFetch(respuestaOk({}));

    await new MercadoPagoAdapter().refundPayment("pay-1", "APP_USR-negocio");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/pay-1/refunds",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer APP_USR-negocio" }),
      }),
    );
  });

  it("debería lanzar sin token",
  async () =>
  {
    await expect(new MercadoPagoAdapter().refundPayment("pay-1"))
      .rejects.toThrow("El negocio aún no conectó MercadoPago para devolver señas.");
  });

  it("debería lanzar cuando el reembolso responde no-ok",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    instalarFetch(respuestaError(404));

    await expect(new MercadoPagoAdapter().refundPayment("pay-1"))
      .rejects.toThrow("No se pudo devolver la seña en MercadoPago.");
  });
});

describe("MercadoPagoAdapter integración",
() =>
{
  it("debería crear y reembolsar punta a punta con red mockeada",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    const fetchMock = instalarFetch(respuestaOk({ id: "pref-int", init_point: "https://pay/int" }));
    const adapter = new MercadoPagoAdapter();

    const preference = await adapter.createDepositPreference({
      bookingId: "book-int",
      amountCents: 6000,
      percentage: 50,
      description: "Seña int",
    });

    instalarFetch(respuestaOk({}));
    await adapter.refundPayment(preference.id);

    expect(preference.checkoutUrl).toBe("https://pay/int");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
