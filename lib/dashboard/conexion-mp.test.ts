import { describe, expect, it } from "vitest";

import { debeAvisarConexionMp, destinoDesconexionMp } from "./conexion-mp";

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

describe("destinoDesconexionMp",
() =>
{
  it("debería avisar con ?mp=sena-activa ante el guarda de seña",
  () =>
  {
    expect(destinoDesconexionMp(
      new Error("Tenés servicios con seña activa. Desactivalas primero en Servicios.")))
      .toBe("/dashboard/config?mp=sena-activa");
  });

  it("debería devolver null ante errores inesperados (se propagan como 500)",
  () =>
  {
    expect(destinoDesconexionMp(new Error("No pudimos desconectar MercadoPago. Probá de nuevo.")))
      .toBeNull();
    expect(destinoDesconexionMp(null)).toBeNull();
    expect(destinoDesconexionMp("texto")).toBeNull();
  });
});
