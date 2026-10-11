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

/** Instala fetch global mockeado y devuelve el mock + cuerpos enviados. */
function instalarFetch(respuesta: unknown)
{
  const cuerpos: string[] = [];
  const fetchMock = vi.fn(async (_url: string, init: { body?: unknown } = {}) =>
  {
    cuerpos.push(typeof init.body === "string" ? init.body : "");

    return respuesta;
  });
  vi.stubGlobal("fetch", fetchMock);

  return { fetchMock, cuerpos };
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
    const { fetchMock } = instalarFetch(respuestaOk({ id: "pref-1", init_point: "https://pay/1" }));
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

  it("debería incluir notification_url con base pública",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com/");
    const { fetchMock, cuerpos } = instalarFetch(respuestaOk({ id: "pref-2", init_point: "https://pay/2" }));

    await new MercadoPagoAdapter().createDepositPreference({
      bookingId: "book-1",
      amountCents: 4000,
      percentage: 25,
      description: "Seña",
      accessToken: "APP_USR-negocio",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer APP_USR-negocio" }),
      }),
    );
    const body = JSON.parse(cuerpos[0]) as { notification_url?: string };

    expect(body.notification_url).toBe("https://turnomas.com/api/webhooks");
  });

  it("debería omitir notification_url sin base pública",
  async () =>
  {
    const { cuerpos } = instalarFetch(respuestaOk({ id: "pref-3", init_point: "https://pay/3" }));

    await new MercadoPagoAdapter().createDepositPreference({
      bookingId: "book-1",
      amountCents: 4000,
      percentage: 25,
      description: "Seña",
      accessToken: "APP_USR-negocio",
    });

    const body = JSON.parse(cuerpos[0]) as { notification_url?: string };

    expect(body.notification_url).toBeUndefined();
  });

  it("debería lanzar sin token (fail-closed, sin fallback)",
  async () =>
  {
    const { fetchMock } = instalarFetch(respuestaOk({ id: "pref-x", init_point: "https://pay/x" }));
    const adapter = new MercadoPagoAdapter();

    await expect(adapter.createDepositPreference({
      bookingId: "book-1",
      amountCents: 10000,
      percentage: 50,
      description: "Seña",
    })).rejects.toThrow("Este negocio aún no conectó MercadoPago");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debería lanzar cuando MercadoPago responde no-ok",
  async () =>
  {
    instalarFetch(respuestaError(400));

    await expect(new MercadoPagoAdapter().createDepositPreference({
      bookingId: "book-1",
      amountCents: 10000,
      percentage: 50,
      description: "Seña",
      accessToken: "APP_USR-negocio",
    })).rejects.toThrow("No se pudo crear la preferencia de pago en MercadoPago.");
  });

  it("debería lanzar con respuesta inválida",
  async () =>
  {
    instalarFetch(respuestaOk({ sin_id: true }));

    await expect(new MercadoPagoAdapter().createDepositPreference({
      bookingId: "book-1",
      amountCents: 10000,
      percentage: 50,
      description: "Seña",
      accessToken: "APP_USR-negocio",
    })).rejects.toThrow("Respuesta inválida de MercadoPago al crear la seña.");
  });
});

describe("MercadoPagoAdapter.refundPayment",
() =>
{
  it("debería reembolsar con el token explícito",
  async () =>
  {
    const { fetchMock } = instalarFetch(respuestaOk({}));

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
      .rejects.toThrow("Este negocio aún no conectó MercadoPago");
  });

  it("debería lanzar cuando el reembolso responde no-ok",
  async () =>
  {
    instalarFetch(respuestaError(404));

    await expect(new MercadoPagoAdapter().refundPayment("pay-1", "APP_USR-negocio"))
      .rejects.toThrow("No se pudo devolver la seña en MercadoPago.");
  });
});

describe("MercadoPagoAdapter integración",
() =>
{
  it("debería crear y reembolsar punta a punta con red mockeada",
  async () =>
  {
    const { fetchMock } = instalarFetch(respuestaOk({ id: "pref-int", init_point: "https://pay/int" }));
    const adapter = new MercadoPagoAdapter();

    const preference = await adapter.createDepositPreference({
      bookingId: "book-int",
      amountCents: 6000,
      percentage: 50,
      description: "Seña int",
      accessToken: "APP_USR-negocio",
    });

    instalarFetch(respuestaOk({}));
    await adapter.refundPayment(preference.id, "APP_USR-negocio");

    expect(preference.checkoutUrl).toBe("https://pay/int");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
