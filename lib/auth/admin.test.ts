import { describe, expect, it } from "vitest";

import { assertAdminEmail, isAdminEmail } from "./admin";

describe("isAdminEmail",
() =>
{
  it("debería aceptar el email configurado sin distinguir mayúsculas ni espacios",
  () =>
  {
    const env = { ADMIN_EMAIL: "  Admin@TurnoMas.com  " };

    expect(isAdminEmail("admin@turnomas.com", env)).toBe(true);
    expect(isAdminEmail("ADMIN@TURNOMAS.COM", env)).toBe(true);
  });

  it("debería rechazar otro email",
  () =>
  {
    expect(isAdminEmail("otro@turnomas.com", { ADMIN_EMAIL: "admin@turnomas.com" })).toBe(false);
  });

  it("debería fallar cerrado sin ADMIN_EMAIL o con email vacío",
  () =>
  {
    expect(isAdminEmail("admin@turnomas.com", {})).toBe(false);
    expect(isAdminEmail("admin@turnomas.com", { ADMIN_EMAIL: "   " })).toBe(false);
    expect(isAdminEmail(null, { ADMIN_EMAIL: "admin@turnomas.com" })).toBe(false);
    expect(isAdminEmail(undefined, { ADMIN_EMAIL: "admin@turnomas.com" })).toBe(false);
  });

  it("no debería aceptar coincidencias parciales",
  () =>
  {
    expect(isAdminEmail("admin@turnomas.com.ar", { ADMIN_EMAIL: "admin@turnomas.com" })).toBe(false);
    expect(isAdminEmail("xadmin@turnomas.com", { ADMIN_EMAIL: "admin@turnomas.com" })).toBe(false);
  });
});

describe("assertAdminEmail",
() =>
{
  it("no debería lanzar para el admin",
  () =>
  {
    expect(() => assertAdminEmail("admin@turnomas.com", { ADMIN_EMAIL: "admin@turnomas.com" }))
      .not.toThrow();
  });

  it("debería lanzar para un email no autorizado",
  () =>
  {
    expect(() => assertAdminEmail("otro@turnomas.com", { ADMIN_EMAIL: "admin@turnomas.com" }))
      .toThrow("No autorizado.");
  });
});
