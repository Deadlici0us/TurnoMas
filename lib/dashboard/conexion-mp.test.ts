import { describe, expect, it } from "vitest";

import { debeAvisarConexionMp } from "./conexion-mp";

describe("debeAvisarConexionMp",
() =>
{
  it("debería avisar con señas activas y sin token",
  () =>
  {
    expect(debeAvisarConexionMp(null, [{ sena_requerida: true }])).toBe(true);
    expect(debeAvisarConexionMp("   ", [{ sena_requerida: true }, { sena_requerida: false }]))
      .toBe(true);
  });

  it("debería callar con token conectado",
  () =>
  {
    expect(debeAvisarConexionMp("APP_USR-x", [{ sena_requerida: true }])).toBe(false);
  });

  it("debería callar sin servicios con seña",
  () =>
  {
    expect(debeAvisarConexionMp(null, [])).toBe(false);
    expect(debeAvisarConexionMp(null, [{ sena_requerida: false }, {}])).toBe(false);
  });
});
