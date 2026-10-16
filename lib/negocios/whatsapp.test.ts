import { describe, expect, it } from "vitest";

import { validarWhatsappNegocio } from "./whatsapp";

describe("validarWhatsappNegocio",
() =>
{
  it("debería devolver null cuando no hay número",
  () =>
  {
    expect(validarWhatsappNegocio(null)).toBeNull();
    expect(validarWhatsappNegocio(undefined)).toBeNull();
    expect(validarWhatsappNegocio("")).toBeNull();
    expect(validarWhatsappNegocio("   ")).toBeNull();
  });

  it("debería aceptar números con formato y código de país",
  () =>
  {
    expect(validarWhatsappNegocio("+54 9 11 1234-5678")).toBe("+54 9 11 1234-5678");
    expect(validarWhatsappNegocio("  5491112345678  ")).toBe("5491112345678");
  });

  it("debería rechazar números demasiado cortos",
  () =>
  {
    expect(() => validarWhatsappNegocio("12345")).toThrow(RangeError);
  });

  it("debería rechazar números demasiado largos",
  () =>
  {
    expect(() => validarWhatsappNegocio("123456789012345678901")).toThrow(RangeError);
  });

  it("debería rechazar textos demasiado largos",
  () =>
  {
    expect(() => validarWhatsappNegocio("+54 9 11 1234-5678 extension 123")).toThrow(RangeError);
  });

  it("debería rechazar valores que no son texto",
  () =>
  {
    expect(() => validarWhatsappNegocio(123)).toThrow(RangeError);
    expect(() => validarWhatsappNegocio({})).toThrow(RangeError);
  });
});
