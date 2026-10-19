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

  it("debería usar el símbolo de peso y separador de miles determinista",
  () =>
  {
    expect(formatearARS(1500000)).toBe("$ 15.000");
    expect(formatearARS(13000)).toBe("$ 130");
  });

  it("debería no depender del ICU del entorno para el símbolo",
  () =>
  {
    expect(formatearARS(13000)).toMatch(/^\$ /);
  });

  it("debería formatear montos negativos con el signo antes del símbolo",
  () =>
  {
    expect(formatearARS(-1500000)).toBe("-$ 15.000");
  });
});
