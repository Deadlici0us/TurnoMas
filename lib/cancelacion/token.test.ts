import { describe, expect, it } from "vitest";

import
{
  construirLinkCancelacion,
  firmarTokenCancelacion,
  verificarTokenCancelacion,
} from "./token";

const SECRETO = "secreto-test-cancelacion";

describe("token de cancelación del cliente",
() =>
{
  it("debería firmar y verificar un token válido hasta el inicio del turno",
  () =>
  {
    const inicio = new Date(Date.now() + 48 * 3_600_000);
    const token = firmarTokenCancelacion(
      { turnoId: "t-1", clienteId: "cli-1", inicio },
      SECRETO,
    );
    const payload = verificarTokenCancelacion(token, SECRETO, new Date());

    expect(payload.turnoId).toBe("t-1");
    expect(payload.clienteId).toBe("cli-1");
  });

  it("debería rechazar el token vencido (pasado el inicio del turno)",
  () =>
  {
    const inicio = new Date(Date.now() - 10 * 60_000);
    const token = firmarTokenCancelacion(
      { turnoId: "t-1", clienteId: "cli-1", inicio },
      SECRETO,
    );

    expect(() => verificarTokenCancelacion(token, SECRETO, new Date()))
      .toThrow("caducó");
  });

  it("debería rechazar tokens firmados con otro secreto o adulterados",
  () =>
  {
    const inicio = new Date(Date.now() + 48 * 3_600_000);
    const token = firmarTokenCancelacion(
      { turnoId: "t-1", clienteId: "cli-1", inicio },
      SECRETO,
    );

    expect(() => verificarTokenCancelacion(token, "otro-secreto", new Date()))
      .toThrow("no es válido");
    expect(() => verificarTokenCancelacion(`${token}adulterado`, SECRETO, new Date()))
      .toThrow();
  });

  it("debería rechazar tokens de otro turno (binding turno-cliente)",
  () =>
  {
    const inicio = new Date(Date.now() + 48 * 3_600_000);
    const token = firmarTokenCancelacion(
      { turnoId: "t-1", clienteId: "cli-1", inicio },
      SECRETO,
    );

    expect(() => verificarTokenCancelacion(token, SECRETO, new Date(), "t-2"))
      .toThrow("no es válido");
  });

  it("debería rechazar formato inválido",
  () =>
  {
    expect(() => verificarTokenCancelacion("sin-puntos", SECRETO, new Date()))
      .toThrow("no es válido");
    expect(() => verificarTokenCancelacion("", SECRETO, new Date()))
      .toThrow("no es válido");
  });

  it("debería construir el link público de cancelación",
  () =>
  {
    const inicio = new Date(Date.now() + 48 * 3_600_000);
    const token = firmarTokenCancelacion(
      { turnoId: "t-1", clienteId: "cli-1", inicio },
      SECRETO,
    );
    const link = construirLinkCancelacion("https://app.test", "t-1", token);

    expect(link).toBe(`https://app.test/cancelar/t-1?token=${encodeURIComponent(token)}`);
  });
});
