import { describe, expect, it } from "vitest";

import { buildOnboardingResult } from "./onboarding-result";

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
