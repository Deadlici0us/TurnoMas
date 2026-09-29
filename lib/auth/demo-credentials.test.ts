import { describe, expect, it } from "vitest";

import { getDemoCredentials } from "./demo-credentials";

describe("getDemoCredentials",
() =>
{
  it("debería devolver la cuenta demo pública por defecto",
  () =>
  {
    expect(getDemoCredentials({})).toEqual({
      email: "demo@turnomas.com",
      password: "demo123",
    });
  });

  it("debería permitir override vía entorno sin exponer valores en código",
  () =>
  {
    expect(
      getDemoCredentials({ DEMO_EMAIL: "  otro@demo.com ", DEMO_PASSWORD: "secreto" }),
    ).toEqual({ email: "otro@demo.com", password: "secreto" });
  });

  it("debería ignorar valores en blanco y caer al defecto",
  () =>
  {
    expect(getDemoCredentials({ DEMO_EMAIL: "   ", DEMO_PASSWORD: "" })).toEqual({
      email: "demo@turnomas.com",
      password: "demo123",
    });
  });
});
