import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createNoncePair } from "./google-identity";

describe("createNoncePair",
() =>
{
  it("debería devolver un nonce crudo y su SHA-256 hexadecimal",
  async () =>
  {
    const pair = await createNoncePair();
    const esperado = createHash("sha256").update(pair.raw).digest("hex");

    expect(pair.raw.length).toBeGreaterThan(0);
    expect(pair.hashed).toBe(esperado);
    expect(pair.hashed).toMatch(/^[a-f0-9]{64}$/);
  });

  it("debería generar nonces distintos en cada llamada",
  async () =>
  {
    const primero = await createNoncePair();
    const segundo = await createNoncePair();

    expect(primero.raw).not.toBe(segundo.raw);
  });
});
