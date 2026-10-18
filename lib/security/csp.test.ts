import { describe, expect, it } from "vitest";

import { buildCspPolicy } from "./csp";

describe("buildCspPolicy",
() =>
{
  it("debería incluir el nonce en script-src y bloquear objetos/frames",
  () =>
  {
    const csp = buildCspPolicy("abc123");

    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it("debería permitir unsafe-eval y omitir upgrade en desarrollo",
  () =>
  {
    const csp = buildCspPolicy("n", true);

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("debería forzar https en producción",
  () =>
  {
    expect(buildCspPolicy("n", false)).toContain("upgrade-insecure-requests");
  });
});
