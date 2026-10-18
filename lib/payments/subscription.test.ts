import { describe, expect, it, vi } from "vitest";

import {
  buscarPreapprovalPorEmail,
  buscarPreapprovalsPorEstado,
  cancelarPreapproval,
  consultarCobroSuscripcion,
  consultarPreapproval,
  crearPreapproval,
  MONTO_PLAN_PESOS,
  MpHttpError,
  parsearMontoCentavos,
  resolverMontoPlan,
  resolverPlanPais,
} from "./subscription";

function respuestaOk(json: unknown)
{
  return { ok: true, status: 200, json: async () => json };
}

function respuestaError(status: number)
{
  return { ok: false, status, json: async () => ({}) };
}

/** Fetch mockeado que captura los cuerpos enviados. */
function instalarMpFetch(respuesta: unknown)
{
  const cuerpos: string[] = [];
  const fetchMock = vi.fn(async (_url: string, init: { body?: unknown } = {}) =>
  {
    cuerpos.push(typeof init.body === "string" ? init.body : "");

    return respuesta;
  });

  return { fetchMock: fetchMock as unknown as typeof fetch, cuerpos };
}

/** Último cuerpo enviado como objeto. */
function ultimoBody(cuerpos: string[]): Record<string, unknown>
{
  return JSON.parse(cuerpos[cuerpos.length - 1]) as Record<string, unknown>;
}

describe("resolverMontoPlan",
() =>
{
  it("debería usar 14999 ARS por defecto",
  () =>
  {
    expect(resolverMontoPlan({})).toBe(14999);
    expect(MONTO_PLAN_PESOS).toBe(14999);
  });

  it("debería aceptar MP_PLAN_MONTO válido",
  () =>
  {
    expect(resolverMontoPlan({ MP_PLAN_MONTO: " 19999 " })).toBe(19999);
  });

  it("debería rechazar montos inválidos",
  () =>
  {
    for (const value of ["cero", "-5", "0", "12.5"])
    {
      expect(() => resolverMontoPlan({ MP_PLAN_MONTO: value })).toThrow("MP_PLAN_MONTO");
    }
  });

  it("debería caer al default con valor en blanco",
  () =>
  {
    expect(resolverMontoPlan({ MP_PLAN_MONTO: "   " })).toBe(14999);
  });
});

describe("resolverPlanPais",
() =>
{
  it("debería dar ARS solo a Argentina y USD al resto",
  () =>
  {
    expect(resolverPlanPais("ar", {})).toEqual(
      { monto: 14999, currency: "ARS", etiqueta: "$ 14.999 ARS/mes" });
    expect(resolverPlanPais("mx", {}).currency).toBe("USD");
    expect(resolverPlanPais("mx", {}).monto).toBe(15);
    expect(resolverPlanPais(null, {}).currency).toBe("USD");
    expect(resolverPlanPais("AR", {}).currency).toBe("ARS");
  });

  it("debería aceptar overrides por env",
  () =>
  {
    expect(resolverPlanPais("ar", { MP_PLAN_ARS: "12999" }).monto).toBe(12999);
    expect(resolverPlanPais("mx", { MP_PLAN_USD: "20" }).monto).toBe(20);
    expect(() => resolverPlanPais("ar", { MP_PLAN_ARS: "cero" })).toThrow("MP_PLAN_ARS");
  });
});

describe("crearPreapproval",
() =>
{
  it("debería crear la suscripción sin plan en pending y devolver el init_point",
  async () =>
  {
    const { fetchMock, cuerpos } = instalarMpFetch(respuestaOk({
      id: "pre-1",
      status: "pending",
      init_point: "https://mp/checkout/pre-1",
    }));

    const result = await crearPreapproval(
      {
        negocioId: "neg-1",
        payerEmail: "pagador@mp.com",
        backUrl: "https://turnomas.com/dashboard/suscripcion",
        monto: 14999,
        currency: "ARS",
        platformToken: "APP_USR-platform",
      },
      fetchMock,
    );

    expect(result).toEqual({ id: "pre-1", initPoint: "https://mp/checkout/pre-1", status: "pending" });
    expect(ultimoBody(cuerpos)).toMatchObject({
      reason: "TurnoMas - Plan mensual",
      external_reference: "neg-1",
      payer_email: "pagador@mp.com",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 14999,
        currency_id: "ARS",
      },
      back_url: "https://turnomas.com/dashboard/suscripcion",
      status: "pending",
    });
    expect(ultimoBody(cuerpos)).not.toHaveProperty("preapproval_plan_id");
    expect(ultimoBody(cuerpos)).not.toHaveProperty("card_token_id");
    expect(ultimoBody(cuerpos)).not.toHaveProperty("notification_url");
  });

  it("debería incluir notification_url cuando se provee",
  async () =>
  {
    const { fetchMock, cuerpos } = instalarMpFetch(respuestaOk({
      id: "pre-2",
      status: "pending",
      init_point: "https://mp/checkout/pre-2",
    }));

    await crearPreapproval(
      {
        negocioId: "neg-1",
        payerEmail: "pagador@mp.com",
        backUrl: "https://turnomas.com/dashboard/suscripcion?suscripcion=ok",
        notificationUrl: "https://turnomas.com/api/webhooks",
        monto: 14999,
        currency: "ARS",
        platformToken: "APP_USR-platform",
      },
      fetchMock,
    );

    expect(ultimoBody(cuerpos)).toMatchObject({
      notification_url: "https://turnomas.com/api/webhooks",
    });
  });

  it("debería lanzar cuando MP rechaza",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaError(400));

    await expect(crearPreapproval(
      {
        negocioId: "neg-1",
        payerEmail: "pagador@mp.com",
        backUrl: "https://turnomas.com/dashboard/suscripcion",
        monto: 14999,
        currency: "ARS",
        platformToken: "APP_USR-platform",
      },
      fetchMock,
    )).rejects.toThrow(/No se pudo crear la suscripción en MercadoPago \(HTTP 400\)/);
  });
});

describe("consultarPreapproval",
() =>
{
  it("debería devolver estado y referencia externa",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({
      id: "pre-1",
      status: "authorized",
      external_reference: "neg-1",
      payer_email: "dueno@negocio.com",
    }));

    const result = await consultarPreapproval("pre-1", "APP_USR-platform", fetchMock);

    expect(result).toEqual({
      id: "pre-1",
      status: "authorized",
      externalReference: "neg-1",
      payerEmail: "dueno@negocio.com",
      initPoint: null,
    });
  });

  it("debería devolver el init_point cuando está presente",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({
      id: "pre-1",
      status: "pending",
      init_point: "https://mp/checkout/pre-1",
    }));

    const result = await consultarPreapproval("pre-1", "APP_USR-platform", fetchMock);

    expect(result.initPoint).toBe("https://mp/checkout/pre-1");
  });

  it("debería lanzar con 404",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaError(404));

    await expect(consultarPreapproval("pre-x", "APP_USR-platform", fetchMock))
      .rejects.toThrow("404");
  });

  it("debería conservar el status HTTP en MpHttpError",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaError(404));

    const error = await consultarPreapproval("pre-x", "APP_USR-platform", fetchMock)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MpHttpError);
    expect((error as MpHttpError).status).toBe(404);
  });
});

describe("cancelarPreapproval",
() =>
{
  it("debería cancelar con PUT",
  async () =>
  {
    const { fetchMock, cuerpos } = instalarMpFetch(respuestaOk({ id: "pre-1", status: "cancelled" }));

    await cancelarPreapproval("pre-1", "APP_USR-platform", fetchMock);

    expect(ultimoBody(cuerpos)).toMatchObject({ status: "cancelled" });
  });
});

describe("consultarCobroSuscripcion",
() =>
{
  it("debería consultar el authorized payment (no /v1/payments) y mapear la cuota",
  async () =>
  {
    const urls: string[] = [];
    const fetchMock = vi.fn(async (url: string) =>
    {
      urls.push(url);

      return respuestaOk({
        id: 7033036606,
        status: "processed",
        external_reference: "neg-1",
        preapproval_id: "pre-1",
        payment: { id: 183627913945, status: "approved", status_detail: "accredited" },
        transaction_amount: "14999.00",
        currency_id: "ARS",
        debit_date: "2026-03-01T11:12:25.892-03:00",
        date_created: "2026-02-25T09:00:00.000-03:00",
      });
    }) as unknown as typeof fetch;

    const result = await consultarCobroSuscripcion("7033036606", "APP_USR-platform", fetchMock);

    expect(urls[0]).toBe("https://api.mercadopago.com/authorized_payments/7033036606");
    expect(result).toEqual({
      id: "7033036606",
      status: "processed",
      payerEmail: null,
      preapprovalId: "pre-1",
      externalReference: "neg-1",
      paymentId: "183627913945",
      paymentStatus: "approved",
      montoCents: 1499900,
      currency: "ARS",
      fecha: "2026-03-01T11:12:25.892-03:00",
    });
  });

  it("debería caer a date_created cuando falta debit_date",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({
      id: 100,
      status: "scheduled",
      external_reference: "neg-1",
      preapproval_id: "pre-1",
      transaction_amount: 15,
      currency_id: "USD",
      date_created: "2026-02-25T09:00:00.000-03:00",
    }));

    const result = await consultarCobroSuscripcion("100", "APP_USR-platform", fetchMock);

    expect(result.montoCents).toBe(1500);
    expect(result.currency).toBe("USD");
    expect(result.fecha).toBe("2026-02-25T09:00:00.000-03:00");
  });

  it("debería dejar monto/currency/fecha en null cuando MP no los expone",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({
      id: 101,
      status: "recycling",
      external_reference: "neg-1",
    }));

    const result = await consultarCobroSuscripcion("101", "APP_USR-platform", fetchMock);

    expect(result.montoCents).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.fecha).toBeNull();
  });

  it("debería devolver el email del pagador cuando MP lo expone",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({
      id: 999,
      status: "recycling",
      external_reference: "neg-1",
      payer: { email: "dueno@negocio.com" },
    }));

    const result = await consultarCobroSuscripcion("999", "APP_USR-platform", fetchMock);

    expect(result.payerEmail).toBe("dueno@negocio.com");
    expect(result.paymentId).toBeNull();
    expect(result.paymentStatus).toBeNull();
  });

  it("debería lanzar MpHttpError con 404",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaError(404));

    const error = await consultarCobroSuscripcion("999", "APP_USR-platform", fetchMock)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MpHttpError);
    expect((error as MpHttpError).status).toBe(404);
  });
});

describe("parsearMontoCentavos",
() =>
{
  it("debería convertir string decimal y número a centavos",
  () =>
  {
    expect(parsearMontoCentavos("14999.00")).toBe(1499900);
    expect(parsearMontoCentavos("24.50")).toBe(2450);
    expect(parsearMontoCentavos(15)).toBe(1500);
  });

  it("debería devolver null con valores inválidos",
  () =>
  {
    expect(parsearMontoCentavos(null)).toBeNull();
    expect(parsearMontoCentavos(undefined)).toBeNull();
    expect(parsearMontoCentavos("abc")).toBeNull();
    expect(parsearMontoCentavos("-5")).toBeNull();
  });
});

describe("buscarPreapprovalPorEmail",
() =>
{
  it("debería devolver la referencia externa del primer resultado",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({
      results: [{ id: "pre-9", external_reference: "neg-9" }],
    }));

    const result = await buscarPreapprovalPorEmail("dueno@negocio.com", "APP_USR-platform", fetchMock);

    expect(result).toEqual({ id: "pre-9", externalReference: "neg-9" });
  });

  it("debería devolver null sin resultados",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({ results: [] }));

    await expect(buscarPreapprovalPorEmail("nadie@x.com", "APP_USR-platform", fetchMock))
      .resolves.toBeNull();
  });
});

describe("buscarPreapprovalsPorEstado",
  () =>
  {
    it("debería listar los preapprovals con referencia, init_point y fecha",
    async () =>
    {
      const { fetchMock } = instalarMpFetch(respuestaOk({
        results: [
          {
            id: "pre-1",
            status: "authorized",
            external_reference: "neg-1",
            init_point: "https://mp/checkout/pre-1",
            last_modified: "2026-10-17T12:00:00.000Z",
          },
          { id: "pre-2", status: "pending", external_reference: "neg-1", date_created: "2026-10-16T12:00:00.000Z" },
          { sinId: true },
        ],
      }));

      const result = await buscarPreapprovalsPorEstado("authorized", "APP_USR-platform", fetchMock);

      expect(result).toEqual([
        {
          id: "pre-1",
          status: "authorized",
          externalReference: "neg-1",
          initPoint: "https://mp/checkout/pre-1",
          lastModified: "2026-10-17T12:00:00.000Z",
        },
        {
          id: "pre-2",
          status: "pending",
          externalReference: "neg-1",
          initPoint: null,
          lastModified: "2026-10-16T12:00:00.000Z",
        },
      ]);
    });

    it("debería enviar el status como filtro",
    async () =>
    {
      const urls: string[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      {
        urls.push(url);

        return { ok: true, status: 200, json: async () => ({ results: [] }) };
      }));

      await buscarPreapprovalsPorEstado("pending", "APP_USR-platform");

      expect(urls[0]).toContain("/preapproval/search?");
      expect(urls[0]).toContain("status=pending");
    });

    it("debería lanzar cuando MP falla",
    async () =>
    {
      const { fetchMock } = instalarMpFetch(respuestaError(500));

      await expect(buscarPreapprovalsPorEstado("authorized", "APP_USR-platform", fetchMock))
        .rejects.toThrow("No se pudieron listar las suscripciones: 500");
    });
  });
