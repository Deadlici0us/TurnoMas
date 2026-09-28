import { describe, expect, it } from "vitest";

import
{
  buildOnboardingResult,
  resolveAuthMode,
} from "./auth-mode";

describe("resolveAuthMode",
() =>
{
  it("debería usar supabase cuando hay URL y clave pública",
  () =>
  {
    expect(
      resolveAuthMode({
        NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
      }),
    ).toBe("supabase");
  });

  it("debería caer a demo sin secrets (build local, tests)",
  () =>
  {
    expect(resolveAuthMode({})).toBe("demo");
  });
});

describe("buildOnboardingResult",
() =>
{
  it("debería construir la URL pública y marcar MP pendiente por defecto",
  () =>
  {
    const result = buildOnboardingResult("ar", "Barbería Diego");

    expect(result).toEqual({
      pais: "ar",
      slug: "barberia-diego",
      url: "/ar/barberia-diego",
      mercadoPagoConectado: false,
      whatsappConectado: false,
    });
  });

  it("debería rechazar país o nombre inválidos",
  () =>
  {
    expect(() => buildOnboardingResult("arg", "Barbería Diego")).toThrow(RangeError);
    expect(() => buildOnboardingResult("ar", "!!!")).toThrow(RangeError);
  });
});
