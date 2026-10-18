import { describe, expect, it } from "vitest";

import { formatearARS } from "./moneda";

describe("formatearARS",
() =>
{
  it("debería formatear centavos como pesos sin decimales",
  () =>
  {
    const texto = formatearARS(1500000);
    const soloDigitos = texto.replace(/\D/g, "");

    expect(soloDigitos).toBe("15000");
  });

  it("debería devolver guion cuando el monto es nulo",
  () =>
  {
    expect(formatearARS(null)).toBe("—");
  });

  it("debería formatear cero",  () =>
  {
    expect(formatearARS(0)).toContain("0");
  });
});
