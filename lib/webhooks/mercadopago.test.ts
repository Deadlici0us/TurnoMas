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

  it("debería verificar firma válida con request-id (manifest oficial MP)",
  async () =>
  {
    const { createHmac } = await import("node:crypto");
    const secreto = "secreto-webhook-test";
    const manifest = "id:182796568127;request-id:req-1;ts:1704908010;";
    const v1 = createHmac("sha256", secreto).update(manifest, "utf8").digest("hex");

    await expect(verificarFirmaMp({
      firma: `ts=1704908010,v1=${v1}`,
      secreto,
      pagoId: "182796568127",
      requestId: "req-1",
      timestamp: "1704908010",
    })).resolves.toBe(true);
  });

  it("debería omitir pares vacíos del manifest",
  async () =>
  {
    const { createHmac } = await import("node:crypto");
    const secreto = "secreto-webhook-test";
    const manifest = "id:182796568127;ts:1704908010;";
    const v1 = createHmac("sha256", secreto).update(manifest, "utf8").digest("hex");

    await expect(verificarFirmaMp({
      firma: `ts=1704908010,v1=${v1}`,
      secreto,
      pagoId: "182796568127",
      requestId: null,
      timestamp: "1704908010",
    })).resolves.toBe(true);
  });

  it("debería rechazar si falta el request-id firmado por MP",
  async () =>
  {
    const { createHmac } = await import("node:crypto");
    const secreto = "secreto-webhook-test";
    const manifest = "id:182796568127;request-id:req-1;ts:1704908010;";
    const v1 = createHmac("sha256", secreto).update(manifest, "utf8").digest("hex");

    await expect(verificarFirmaMp({
      firma: `ts=1704908010,v1=${v1}`,
      secreto,
      pagoId: "182796568127",
      requestId: null,
      timestamp: "1704908010",
    })).resolves.toBe(false);
  });

  it("debería minúsculas en data.id antes de firmar",
  async () =>
  {
    const { createHmac } = await import("node:crypto");
    const secreto = "secreto-webhook-test";
    const manifest = "id:ord01jq4s4ky8hwq6na5pxb65b3d3;ts:1704908010;";
    const v1 = createHmac("sha256", secreto).update(manifest, "utf8").digest("hex");

    await expect(verificarFirmaMp({
      firma: `ts=1704908010,v1=${v1}`,
      secreto,
      pagoId: "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3",
      requestId: null,
      timestamp: "1704908010",
    })).resolves.toBe(true);
  });
});
