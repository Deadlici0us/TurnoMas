import { describe, expect, it } from "vitest";

import
{
  maskMpToken,
  NegocioSinMpError,
  requireBusinessMpToken,
  resolveEffectiveMpToken,
  SIN_MP_MESSAGE,
} from "./mp-token";

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
    expect(resolveEffectiveMpToken(null, null)).toBeNull();
  });
});

describe("requireBusinessMpToken",
() =>
{
  it("debería devolver el token del negocio",
  () =>
  {
    expect(requireBusinessMpToken("APP_USR-negocio")).toBe("APP_USR-negocio");
  });

  it("debería lanzar sin token (fail-closed, sin fallback)",
  () =>
  {
    expect(() => requireBusinessMpToken(null)).toThrow(SIN_MP_MESSAGE);
    expect(() => requireBusinessMpToken("   ")).toThrow(NegocioSinMpError);
  });
});


