import { describe, expect, it } from "vitest";

import { assertDuenoEditable, assertModoEditable, DEMO_READONLY_MESSAGE, isDemoOwner } from "./demo-guard";

describe("isDemoOwner",
() =>
{
  it("debería reconocer al dueño demo por email",
  () =>
  {
    expect(isDemoOwner({ userId: "otro-id", email: "demo@turnomas.com" }, {})).toBe(true);
  });

  it("debería comparar emails sin importar mayúsculas ni espacios",
  () =>
  {
    expect(isDemoOwner({ userId: "otro-id", email: "  Demo@TurnoMas.com " }, {})).toBe(true);
  });

  it("debería reconocer al dueño demo por DEMO_DUENIO_ID",
  () =>
  {
    const env = { DEMO_DUENIO_ID: "11111111-1111-4111-8111-111111111111" };

    expect(isDemoOwner(
      { userId: "11111111-1111-4111-8111-111111111111", email: "otro@negocio.com" },
      env,
    )).toBe(true);
  });

  it("debería respetar el override de DEMO_EMAIL",
  () =>
  {
    const env = { DEMO_EMAIL: "prueba@demo.com" };

    expect(isDemoOwner({ userId: "otro-id", email: "prueba@demo.com" }, env)).toBe(true);
    expect(isDemoOwner({ userId: "otro-id", email: "demo@turnomas.com" }, env)).toBe(false);
  });

  it("debería devolver falso para cuentas normales o sin identidad",
  () =>
  {
    expect(isDemoOwner({ userId: "dueño-real", email: "dueño@negocio.com" }, {})).toBe(false);
    expect(isDemoOwner({ userId: null, email: null }, {})).toBe(false);
  });
});

describe("assertDuenoEditable",
() =>
{
  it("debería lanzar error de solo lectura para la cuenta demo",
  () =>
  {
    expect(() => assertDuenoEditable({ userId: "x", email: "demo@turnomas.com" }, {}))
      .toThrow(DEMO_READONLY_MESSAGE);
  });

  it("no debería lanzar para cuentas normales",
  () =>
  {
    expect(() => assertDuenoEditable({ userId: "dueño-real", email: "dueño@negocio.com" }, {}))
      .not.toThrow();
  });
});

describe("assertModoEditable",
() =>
{
  it("debería lanzar error de solo lectura en modo demo local",
  async () =>
  {
    await expect(assertModoEditable({})).rejects.toThrow(DEMO_READONLY_MESSAGE);
  });

  it("no debería lanzar con Supabase configurado",
  async () =>
  {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://xyzcompany.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    };

    await expect(assertModoEditable(env)).resolves.toBeUndefined();
  });
});
