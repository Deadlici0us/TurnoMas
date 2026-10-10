import { describe, expect, it } from "vitest";

import
{
  exigeFirmas,
  isSupabaseConfigured,
  readEnv,
} from "./env";

describe("readEnv",
() =>
{
  it("debería leer variables del entorno provisto",
  () =>
  {
    expect(readEnv("RESEND_API_KEY", { RESEND_API_KEY: "re_123" })).toBe("re_123");
  });

  it("debería devolver null cuando falta la variable",
  () =>
  {
    expect(readEnv("RESEND_API_KEY", {})).toBeNull();
  });

  it("debería tratar cadenas vacías o en blanco como ausentes",
  () =>
  {
    expect(readEnv("RESEND_API_KEY", { RESEND_API_KEY: "   " })).toBeNull();
  });
});

describe("exigeFirmas",
() =>
{
  it("debería exigir firmas en producción",
  () =>
  {
    expect(exigeFirmas({ NODE_ENV: "production" })).toBe(true);
  });

  it("debería permitir modo permisivo fuera de producción",
  () =>
  {
    expect(exigeFirmas({ NODE_ENV: "test" })).toBe(false);
    expect(exigeFirmas({ NODE_ENV: "development" })).toBe(false);
    expect(exigeFirmas({})).toBe(false);
  });
});

describe("isSupabaseConfigured",
() =>
{
  it("debería ser verdadero con URL y clave pública presentes",
  () =>
  {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
    };

    expect(isSupabaseConfigured(env)).toBe(true);
  });

  it("debería ser falso si falta alguna de las dos",
  () =>
  {
    expect(isSupabaseConfigured({})).toBe(false);
    expect(
      isSupabaseConfigured({ NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co" }),
    ).toBe(false);
    expect(
      isSupabaseConfigured({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123" }),
    ).toBe(false);
  });
});
