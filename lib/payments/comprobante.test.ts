import { describe, expect, it } from "vitest";

import {
  comprobantePagoUrl,
  comprobanteSuscripcionUrl,
  dominioMpPorPais,
} from "./comprobante";

describe("dominioMpPorPais",
() =>
{
  it("debería resolver com.ar para Argentina",
  () =>
  {
    expect(dominioMpPorPais("ar")).toBe("www.mercadopago.com.ar");
    expect(dominioMpPorPais("AR")).toBe("www.mercadopago.com.ar");
    expect(dominioMpPorPais("  ar  ")).toBe("www.mercadopago.com.ar");
  });

  it("debería resolver com.mx para México",
  () =>
  {
    expect(dominioMpPorPais("mx")).toBe("www.mercadopago.com.mx");
  });

  it("debería caer a com.ar sin país o con país desconocido",
  () =>
  {
    expect(dominioMpPorPais(null)).toBe("www.mercadopago.com.ar");
    expect(dominioMpPorPais(undefined)).toBe("www.mercadopago.com.ar");
    expect(dominioMpPorPais("")).toBe("www.mercadopago.com.ar");
    expect(dominioMpPorPais("xx")).toBe("www.mercadopago.com.ar");
  });
});

describe("comprobantePagoUrl",
() =>
{
  it("debería construir el detalle de actividad para un pago",
  () =>
  {
    expect(comprobantePagoUrl("1234567890", "ar")).toBe(
      "https://www.mercadopago.com.ar/activities/payment-detail/1234567890");
  });

  it("debería recortar espacios del ID",
  () =>
  {
    expect(comprobantePagoUrl("  1234567890  ", "ar")).toBe(
      "https://www.mercadopago.com.ar/activities/payment-detail/1234567890");
  });

  it("debería codificar caracteres especiales del ID",
  () =>
  {
    expect(comprobantePagoUrl("a/b?c", "ar")).toBe(
      "https://www.mercadopago.com.ar/activities/payment-detail/a%2Fb%3Fc");
  });

  it("debería usar el dominio de México con país mx",
  () =>
  {
    expect(comprobantePagoUrl("1234567890", "mx")).toBe(
      "https://www.mercadopago.com.mx/activities/payment-detail/1234567890");
  });

  it("debería devolver null sin ID",
  () =>
  {
    expect(comprobantePagoUrl(null, "ar")).toBeNull();
    expect(comprobantePagoUrl(undefined, "ar")).toBeNull();
    expect(comprobantePagoUrl("", "ar")).toBeNull();
    expect(comprobantePagoUrl("   ", "ar")).toBeNull();
  });

  it("debería funcionar sin país explícito",
  () =>
  {
    expect(comprobantePagoUrl("1234567890")).toBe(
      "https://www.mercadopago.com.ar/activities/payment-detail/1234567890");
  });
});

describe("comprobanteSuscripcionUrl",
() =>
{
  it("debería construir el detalle de suscripción para un preapproval",
  () =>
  {
    expect(comprobanteSuscripcionUrl("pre-1", "ar")).toBe(
      "https://www.mercadopago.com.ar/subscriptions/detail/pre-1");
  });

  it("debería recortar espacios del ID",
  () =>
  {
    expect(comprobanteSuscripcionUrl("  pre-1  ", "ar")).toBe(
      "https://www.mercadopago.com.ar/subscriptions/detail/pre-1");
  });

  it("debería usar el dominio de México con país mx",
  () =>
  {
    expect(comprobanteSuscripcionUrl("pre-1", "mx")).toBe(
      "https://www.mercadopago.com.mx/subscriptions/detail/pre-1");
  });

  it("debería devolver null sin ID",
  () =>
  {
    expect(comprobanteSuscripcionUrl(null, "ar")).toBeNull();
    expect(comprobanteSuscripcionUrl(undefined, "ar")).toBeNull();
    expect(comprobanteSuscripcionUrl("", "ar")).toBeNull();
    expect(comprobanteSuscripcionUrl("   ", "ar")).toBeNull();
  });
});
