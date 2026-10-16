import { describe, expect, it, vi } from "vitest";

import {
  buscarPreapprovalPorEmail,
  cancelarPreapproval,
  consultarCobroSuscripcion,
  consultarPreapproval,
  crearPlanPreapproval,
  crearPreapproval,
  MONTO_PLAN_PESOS,
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
      { monto: 14999, currency: "ARS", etiqueta: "$ 14.999 ARS/mes", planId: null });
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

  it("debería resolver el planId del plan de MP por país",
  () =>
  {
    expect(resolverPlanPais("ar", { MP_PLAN_ID_AR: "plan-ar-1" }).planId).toBe("plan-ar-1");
    expect(resolverPlanPais("ar", {}).planId).toBeNull();
    expect(resolverPlanPais("mx", { MP_PLAN_ID_USD: "plan-usd-1" }).planId).toBe("plan-usd-1");
  });
});

describe("crearPlanPreapproval",
() =>
{
  it("debería crear el plan reutilizable y devolver su id",
  async () =>
  {
    const { fetchMock, cuerpos } = instalarMpFetch(respuestaOk({ id: "plan-ar-1" }));

    const result = await crearPlanPreapproval(
      {
        reason: "TurnoMas - Plan mensual",
        backUrl: "https://turnomas.com/dashboard/facturacion",
        monto: 14999,
        currency: "ARS",
        platformToken: "APP_USR-platform",
      },
      fetchMock,
    );

    expect(result).toEqual({ id: "plan-ar-1" });
    expect(ultimoBody(cuerpos)).toMatchObject({
      reason: "TurnoMas - Plan mensual",
      back_url: "https://turnomas.com/dashboard/facturacion",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 14999,
        currency_id: "ARS",
      },
    });
  });

  it("debería lanzar cuando MP rechaza el plan",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaError(401));

    await expect(crearPlanPreapproval(
      {
        reason: "x",
        backUrl: "https://x/y",
        monto: 14999,
        currency: "ARS",
        platformToken: "APP_USR-platform",
      },
      fetchMock,
    )).rejects.toThrow(/No se pudo crear el plan en MercadoPago \(HTTP 401\)/);
  });
});

describe("crearPreapproval",
() =>
{
  it("debería crear la suscripción sobre el plan con la tarjeta tokenizada",
  async () =>
  {
    const { fetchMock, cuerpos } = instalarMpFetch(respuestaOk({ id: "pre-1", status: "authorized" }));

    const result = await crearPreapproval(
      {
        negocioId: "neg-1",
        payerEmail: "pagador@mp.com",
        cardTokenId: "card-tok-1",
        planId: "plan-ar-1",
        backUrl: "https://turnomas.com/dashboard/facturacion",
        platformToken: "APP_USR-platform",
      },
      fetchMock,
    );

    expect(result).toEqual({ id: "pre-1", status: "authorized" });
    expect(ultimoBody(cuerpos)).toMatchObject({
      preapproval_plan_id: "plan-ar-1",
      payer_email: "pagador@mp.com",
      card_token_id: "card-tok-1",
      external_reference: "neg-1",
      back_url: "https://turnomas.com/dashboard/facturacion",
      status: "authorized",
    });
    expect(ultimoBody(cuerpos)).not.toHaveProperty("auto_recurring");
  });

  it("debería lanzar cuando MP rechaza",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaError(400));

    await expect(crearPreapproval(
      {
        negocioId: "neg-1",
        payerEmail: "pagador@mp.com",
        cardTokenId: "card-tok-1",
        planId: "plan-ar-1",
        backUrl: "https://turnomas.com/dashboard/facturacion",
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
    });
  });

  it("debería lanzar con 404",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaError(404));

    await expect(consultarPreapproval("pre-x", "APP_USR-platform", fetchMock))
      .rejects.toThrow("404");
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
  it("debería devolver estado y email del pagador",
  async () =>
  {
    const { fetchMock } = instalarMpFetch(respuestaOk({
      id: 999,
      status: "approved",
      payer: { email: "dueno@negocio.com" },
    }));

    const result = await consultarCobroSuscripcion("999", "APP_USR-platform", fetchMock);

    expect(result).toEqual({ id: "999", status: "approved", payerEmail: "dueno@negocio.com" });
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
