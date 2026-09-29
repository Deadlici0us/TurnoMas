import { describe, expect, it, vi } from "vitest";

import { verificarFirmaQStash } from "./qstash";

const SECRETO = "clave-de-test-qstash";

function base64url(json: string): string
{
  return Buffer.from(json, "utf8").toString("base64url");
}

async function firmar(payload: Record<string, unknown>, secreto: string): Promise<string>
{
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const { createHmac } = await import("node:crypto");
  const firma = createHmac("sha256", secreto).update(`${header}.${body}`).digest("base64url");

  return `${header}.${body}.${firma}`;
}

describe("verificarFirmaQStash",
() =>
{
  it("debería permitir cuando no hay secretos configurados",
  async () =>
  {
    await expect(verificarFirmaQStash({ firma: null, claveActual: null, claveSiguiente: null }))
      .resolves.toBe(true);
  });

  it("debería rechazar firma ausente con secreto configurado",
  async () =>
  {
    await expect(verificarFirmaQStash({ firma: null, claveActual: SECRETO, claveSiguiente: null }))
      .resolves.toBe(false);
  });

  it("debería aceptar un JWT válido firmado con la clave actual",
  async () =>
  {
    const exp = Math.floor(Date.now() / 1000) + 300;
    const token = await firmar({ iss: "Upstash", exp }, SECRETO);

    await expect(verificarFirmaQStash({ firma: token, claveActual: SECRETO, claveSiguiente: null }))
      .resolves.toBe(true);
  });

  it("debería rechazar un JWT expirado o manipulado",
  async () =>
  {
    const expirado = await firmar({ iss: "Upstash", exp: Math.floor(Date.now() / 1000) - 10 },
      SECRETO);

    await expect(verificarFirmaQStash({ firma: expirado, claveActual: SECRETO, claveSiguiente: null }))
      .resolves.toBe(false);

    const valido = await firmar({ iss: "Upstash", exp: Math.floor(Date.now() / 1000) + 300 },
      SECRETO);

    await expect(verificarFirmaQStash({ firma: `${valido}manipulado`, claveActual: SECRETO,
      claveSiguiente: null })).resolves.toBe(false);
  });

  it("debería usar vi.stubEnv sin fugas entre tests", () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "temporal");
    expect(process.env.QSTASH_CURRENT_SIGNING_KEY).toBe("temporal");
    vi.unstubAllEnvs();
    expect(process.env.QSTASH_CURRENT_SIGNING_KEY).toBeUndefined();
  });
});
