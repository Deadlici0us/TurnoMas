import { describe, expect, it } from "vitest";

import
{
  enmascararEmail,
  firmarTokenEliminacion,
  generarCodigoEliminacion,
  hashCodigoEliminacion,
  TEXTO_CONFIRMACION_ELIMINACION,
  validarTextoConfirmacion,
  verificarTokenEliminacion,
} from "./eliminacion";

describe("eliminacion del negocio",
() =>
{
  it("debería generar códigos de 6 dígitos",
  () =>
  {
    for (let i = 0; i < 20; i += 1)
    {
      expect(generarCodigoEliminacion()).toMatch(/^\d{6}$/);
    }
  });

  it("debería firmar y verificar un token válido",
  () =>
  {
    const codigo = "123456";
    const token = firmarTokenEliminacion(
      { negocioId: "neg-1", email: "a@b.com", codigoHash: hashCodigoEliminacion(codigo), exp: Date.now() + 600_000 },
      "secreto-test",
    );
    const payload = verificarTokenEliminacion(token, "secreto-test");

    expect(payload.negocioId).toBe("neg-1");
    expect(payload.codigoHash).toBe(hashCodigoEliminacion(codigo));
  });

  it("debería rechazar tokens vencidos, firmados con otro secreto o adulterados",
  () =>
  {
    const vencido = firmarTokenEliminacion(
      { negocioId: "n", email: "a@b.com", codigoHash: "x", exp: Date.now() - 1_000 },
      "secreto-test",
    );

    expect(() => verificarTokenEliminacion(vencido, "secreto-test")).toThrow("caducó");
    expect(() => verificarTokenEliminacion(vencido, "otro-secreto")).toThrow();

    const valido = firmarTokenEliminacion(
      { negocioId: "n", email: "a@b.com", codigoHash: "x", exp: Date.now() + 600_000 },
      "secreto-test",
    );

    expect(() => verificarTokenEliminacion(`${valido}adulterado`, "secreto-test")).toThrow();
  });

  it("debería exigir el texto ELIMINAR y enmascarar el email",
  () =>
  {
    expect(() => validarTextoConfirmacion("eliminar")).toThrow(TEXTO_CONFIRMACION_ELIMINACION);
    expect(validarTextoConfirmacion("ELIMINAR")).toBe(true);
    expect(enmascararEmail("juan@gmail.com")).toBe("j***@gmail.com");
    expect(enmascararEmail("no-es-email")).toBe("***");
  });
});
