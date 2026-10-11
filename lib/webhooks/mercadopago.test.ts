import { describe, expect, it } from "vitest";

import { esAltaSuscripcion, esCobroSuscripcion, extraerPagoId, verificarFirmaMp } from "./mercadopago";

describe("extraerPagoId",
() =>
{
  it("debería extraer el id del formato clásico type/data",
  () =>
  {
    expect(extraerPagoId({ type: "payment", data: { id: "12345" } })).toBe("12345");
  });

  it("debería extraer el id del formato action/resource",
  () =>
  {
    expect(extraerPagoId({ action: "payment.created", data: { id: "999" } })).toBe("999");
    expect(extraerPagoId({ topic: "payment", resource: "https://api.mercadopago.com/v1/payments/777" })).toBe("777");
  });

  it("debería devolver null sin id válido",
  () =>
  {
    expect(extraerPagoId({ type: "payment", data: {} })).toBeNull();
    expect(extraerPagoId({ type: "otro" })).toBeNull();
    expect(extraerPagoId(null)).toBeNull();
  });
});

describe("esAltaSuscripcion",
() =>
{
  it("debería detectar el tópico subscription_preapproval",
  () =>
  {
    expect(esAltaSuscripcion({ type: "subscription_preapproval", data: { id: "pre-1" } })).toBe(true);
    expect(esAltaSuscripcion({ topic: "subscription_preapproval", resource: "x" })).toBe(true);
  });

  it("debería rechazar otros tópicos",
  () =>
  {
    expect(esAltaSuscripcion({ type: "payment", data: { id: "1" } })).toBe(false);
    expect(esAltaSuscripcion({ type: "subscription_authorized_payment", data: { id: "1" } })).toBe(false);
    expect(esAltaSuscripcion(null)).toBe(false);
  });
});

describe("esCobroSuscripcion",
() =>
{
  it("debería detectar el tópico subscription_authorized_payment",
  () =>
  {
    expect(esCobroSuscripcion({ type: "subscription_authorized_payment", data: { id: "999" } })).toBe(true);
    expect(esCobroSuscripcion({ topic: "subscription_authorized_payment", resource: "x" })).toBe(true);
  });

  it("debería rechazar otros tópicos",
  () =>
  {
    expect(esCobroSuscripcion({ type: "payment", data: { id: "1" } })).toBe(false);
    expect(esCobroSuscripcion({ type: "subscription_preapproval", data: { id: "1" } })).toBe(false);
    expect(esCobroSuscripcion(null)).toBe(false);
  });
});

describe("verificarFirmaMp",
() =>
{
  it("debería permitir cuando no hay secreto configurado",
  async () =>
  {
    await expect(verificarFirmaMp({ firma: null, secreto: null, pagoId: "1", timestamp: "2" }))
      .resolves.toBe(true);
  });

  it("debería rechazar firma ausente con secreto configurado",
  async () =>
  {
    await expect(verificarFirmaMp({ firma: null, secreto: "secreto", pagoId: "1", timestamp: "2" }))
      .resolves.toBe(false);
  });

  it("debería rechazar firma inválida en español sin lanzar",
  async () =>
  {
    await expect(verificarFirmaMp({ firma: "ts=2,v1=invalida", secreto: "secreto", pagoId: "1",
      timestamp: "2" })).resolves.toBe(false);
  });
});
