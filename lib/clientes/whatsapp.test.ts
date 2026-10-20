import { describe, expect, it } from "vitest";

import {
  analizarWhatsappCliente,
  normalizarWhatsappCliente,
  WHATSAPP_CARACTERES_INVALIDOS,
  WHATSAPP_LARGO_INVALIDO,
  WHATSAPP_NUMERO_INVALIDO,
  WHATSAPP_VACIO,
} from "./whatsapp";

const CANONICO = "+5491164534124";

describe("normalizarWhatsappCliente",
() =>
{
  it("debería unificar los formatos argentinos habituales",
  () =>
  {
    for (const numero of [
      "+54 9 11 15 64534124",
      "+54 11 64534124",
      "1164534124",
      "0 11 15 6453-4124",
      "+5491164534124",
      "54 9 11 64534124",
      "9 11 6453 4124",
    ])
    {
      expect(normalizarWhatsappCliente(numero)).toBe(CANONICO);
    }
  });

  it("debería normalizar números de otras áreas argentinas",
  () =>
  {
    expect(normalizarWhatsappCliente("+54 351 15 123-4567")).toBe("+5493511234567");
    expect(normalizarWhatsappCliente("0351 15 123-4567")).toBe("+5493511234567");
  });

  it("debería ser idempotente",
  () =>
  {
    expect(normalizarWhatsappCliente(CANONICO)).toBe(CANONICO);
  });

  it("debería conservar números internacionales con prefijo explícito",
  () =>
  {
    expect(normalizarWhatsappCliente("+1 (415) 555-2671")).toBe("+14155552671");
    expect(normalizarWhatsappCliente("0044 20 7946 0958")).toBe("+442079460958");
  });

  it("debería rechazar números con letras o caracteres raros",
  () =>
  {
    expect(() => normalizarWhatsappCliente("11abc64534124"))
      .toThrow(WHATSAPP_CARACTERES_INVALIDOS);
    expect(() => normalizarWhatsappCliente("11+64534124"))
      .toThrow(WHATSAPP_CARACTERES_INVALIDOS);
    expect(() => normalizarWhatsappCliente("11 6453 4124!"))
      .toThrow(WHATSAPP_CARACTERES_INVALIDOS);
  });

  it("debería rechazar números fuera de largo",
  () =>
  {
    expect(() => normalizarWhatsappCliente("123")).toThrow(WHATSAPP_LARGO_INVALIDO);
    expect(() => normalizarWhatsappCliente("1234567890123456")).toThrow(WHATSAPP_LARGO_INVALIDO);
  });

  it("debería rechazar números argentinos que no quedan en 10 dígitos",
  () =>
  {
    expect(() => normalizarWhatsappCliente("+54 11 1234")).toThrow(WHATSAPP_NUMERO_INVALIDO);
    expect(() => normalizarWhatsappCliente("+54 9 11 15 1234")).toThrow(WHATSAPP_NUMERO_INVALIDO);
    expect(() => normalizarWhatsappCliente("15 6453-4124")).toThrow(WHATSAPP_NUMERO_INVALIDO);
  });

  it("debería rechazar valores vacíos o no textuales",
  () =>
  {
    expect(() => normalizarWhatsappCliente("")).toThrow(WHATSAPP_VACIO);
    expect(() => normalizarWhatsappCliente("   ")).toThrow(WHATSAPP_VACIO);
    expect(() => normalizarWhatsappCliente(null)).toThrow(WHATSAPP_VACIO);
  });

  it("debería devolver el detalle sin lanzar en analizarWhatsappCliente",
  () =>
  {
    expect(analizarWhatsappCliente("1164534124")).toEqual({ ok: true, valor: CANONICO });
    expect(analizarWhatsappCliente("abc")).toEqual({ ok: false, error: WHATSAPP_CARACTERES_INVALIDOS });
  });
});
