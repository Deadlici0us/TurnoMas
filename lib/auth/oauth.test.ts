import { describe, expect, it } from "vitest";

import
{
  buildOAuthCallbackUrl,
  resolveAppBaseUrl,
  resolvePostOAuthPath,
  sanitizeNextPath,
} from "./oauth";

describe("resolveAppBaseUrl",
() =>
{
  it("debería preferir NEXT_PUBLIC_APP_URL y recortar barras finales",
  () =>
  {
    expect(
      resolveAppBaseUrl({ NEXT_PUBLIC_APP_URL: "https://turnomas.com///" }),
    ).toBe("https://turnomas.com");
  });

  it("debería caer a VERCEL_URL con https cuando no hay URL pública",
  () =>
  {
    expect(resolveAppBaseUrl({ VERCEL_URL: "mi-app.vercel.app" })).toBe("https://mi-app.vercel.app");
  });

  it("debería devolver null sin ninguna variable configurada",
  () =>
  {
    expect(resolveAppBaseUrl({})).toBeNull();
  });

  it("debería ignorar valores en blanco",
  () =>
  {
    expect(resolveAppBaseUrl({ NEXT_PUBLIC_APP_URL: "   ", VERCEL_URL: "  " })).toBeNull();
  });
});

describe("buildOAuthCallbackUrl",
() =>
{
  it("debería construir /auth/callback sobre la base pública",
  () =>
  {
    expect(
      buildOAuthCallbackUrl({ NEXT_PUBLIC_APP_URL: "https://turnomas.com" }),
    ).toBe("https://turnomas.com/auth/callback");
  });

  it("debería devolver null sin base configurada",
  () =>
  {
    expect(buildOAuthCallbackUrl({})).toBeNull();
  });
});

describe("resolvePostOAuthPath",
() =>
{
  it("debería ir al dashboard cuando el dueño ya tiene negocio",
  () =>
  {
    expect(resolvePostOAuthPath(true)).toBe("/dashboard");
  });

  it("debería ir al onboarding cuando es cuenta nueva sin negocio",
  () =>
  {
    expect(resolvePostOAuthPath(false)).toBe("/onboarding");
  });
});

describe("sanitizeNextPath",
() =>
{
  it("debería aceptar rutas internas válidas",
  () =>
  {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/onboarding?error=datos")).toBe("/onboarding?error=datos");
  });

  it("debería rechazar URLs externas y protocolos",
  () =>
  {
    expect(sanitizeNextPath("https://evil.com")).toBeNull();
    expect(sanitizeNextPath("//evil.com/x")).toBeNull();
    expect(sanitizeNextPath("javascript:alert(1)")).toBeNull();
    expect(sanitizeNextPath("dashboard")).toBeNull();
  });

  it("debería rechazar nulos y vacíos",
  () =>
  {
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
    expect(sanitizeNextPath("   ")).toBeNull();
  });
});
