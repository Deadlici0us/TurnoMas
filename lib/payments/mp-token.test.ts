import { describe, expect, it, vi } from "vitest";

import
{
  isValidMpTokenFormat,
  maskMpToken,
  resolveEffectiveMpToken,
  verifyMpToken,
} from "./mp-token";

describe("isValidMpTokenFormat",
() =>
{
  it("debería aceptar tokens de prueba y producción",
  () =>
  {
    expect(isValidMpTokenFormat("APP_USR-123456")).toBe(true);
    expect(isValidMpTokenFormat("TEST-123456")).toBe(true);
  });

  it("debería rechazar vacío, corto o con espacios",
  () =>
  {
    expect(isValidMpTokenFormat("")).toBe(false);
    expect(isValidMpTokenFormat("   ")).toBe(false);
    expect(isValidMpTokenFormat("corto")).toBe(false);
    expect(isValidMpTokenFormat("APP USR-123")).toBe(false);
  });
});

describe("maskMpToken",
() =>
{
  it("debería ocultar todo salvo los últimos 4 para la UI",
  () =>
  {
    expect(maskMpToken("APP_USR-12345678")).toBe("••••5678");
  });

  it("debería devolver vacío sin token",
  () =>
  {
    expect(maskMpToken(null)).toBe("—");
  });
});

describe("resolveEffectiveMpToken",
() =>
{
  it("debería preferir el token del negocio sobre el de la plataforma",
  () =>
  {
    expect(resolveEffectiveMpToken("APP_USR-negocio", "APP_USR-plataforma")).toBe("APP_USR-negocio");
  });

  it("debería caer a la plataforma sin token del negocio",
  () =>
  {
    expect(resolveEffectiveMpToken(null, "APP_USR-plataforma")).toBe("APP_USR-plataforma");
  });

  it("debería devolver null sin ningún token",
  () =>
  {
    expect(resolveEffectiveMpToken(null, null)).toBe(null);
  });
});

describe("verifyMpToken",
() =>
{
  it("debería validar el token contra la API de MercadoPago",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });

    await expect(verifyMpToken("APP_USR-123456", fetchFn)).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledWith("https://api.mercadopago.com/users/me",
      expect.objectContaining({ method: "GET" }));
  });

  it("debería rechazar tokens inválidos (401 de MP)",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    await expect(verifyMpToken("APP_USR-malo123", fetchFn)).resolves.toBe(false);
  });

  it("debería devolver false ante errores de red",
  async () =>
  {
    const fetchFn = vi.fn().mockRejectedValue(new Error("red caída"));

    await expect(verifyMpToken("APP_USR-123456", fetchFn)).resolves.toBe(false);
  });
});
