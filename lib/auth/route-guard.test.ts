import { describe, expect, it } from "vitest";

import
{
  ADQUIRIR_SERVICIO_ROUTE,
  isRutaAdquirirServicio,
  isRutaExentaBloqueo,
  resolveAccessRedirect,
  resolveBlockedRedirect,
  resolveRootRedirect,
} from "./route-guard";
import type { AccessSnapshot } from "./route-guard";

/** Snapshot base de invitado para sobreescribir en cada caso. */
function snapshot(overrides: Partial<AccessSnapshot> = {}): AccessSnapshot
{
  return { session: "guest", subscription: "trial", hasBusiness: false, ...overrides };
}

describe("resolveRootRedirect",
() =>
{
  it("debería dejar pasar la raíz sin sesión",
  () =>
  {
    expect(resolveRootRedirect("/", "guest", false)).toBeNull();
  });

  it("debería llevar al dashboard al logueado con negocio",
  () =>
  {
    expect(resolveRootRedirect("/", "authenticated", true)).toBe("/dashboard");
  });

  it("debería llevar a onboarding al logueado sin negocio",
  () =>
  {
    expect(resolveRootRedirect("/", "authenticated", false)).toBe("/onboarding");
  });

  it("no debería redirigir rutas que no sean la raíz",
  () =>
  {
    expect(resolveRootRedirect("/features", "authenticated", true)).toBeNull();
    expect(resolveRootRedirect("/dashboard", "authenticated", true)).toBeNull();
  });
});

describe("resolveBlockedRedirect",
() =>
{
  it("no debería bloquear a un invitado",
  () =>
  {
    expect(resolveBlockedRedirect("/dashboard/agenda", "guest", "blocked")).toBeNull();
  });

  it("debería redirigir cualquier ruta del logueado bloqueado",
  () =>
  {
    expect(resolveBlockedRedirect("/dashboard/agenda", "authenticated", "blocked"))
      .toBe(ADQUIRIR_SERVICIO_ROUTE);
    expect(resolveBlockedRedirect("/", "authenticated", "blocked"))
      .toBe(ADQUIRIR_SERVICIO_ROUTE);
    expect(resolveBlockedRedirect("/features", "authenticated", "blocked"))
      .toBe(ADQUIRIR_SERVICIO_ROUTE);
    expect(resolveBlockedRedirect("/pais-negocio/sucursal", "authenticated", "blocked"))
      .toBe(ADQUIRIR_SERVICIO_ROUTE);
  });

  it("debería permitir la ruta de adquisición al bloqueado",
  () =>
  {
    expect(resolveBlockedRedirect("/dashboard/suscripcion", "authenticated", "blocked")).toBeNull();
  });

  it("debería permitir login y OAuth al bloqueado (evita lockout)",
  () =>
  {
    expect(resolveBlockedRedirect("/login", "authenticated", "blocked")).toBeNull();
    expect(resolveBlockedRedirect("/auth/callback", "authenticated", "blocked")).toBeNull();
  });

  it("debería permitir /admin al administrador bloqueado",
  () =>
  {
    expect(resolveBlockedRedirect("/admin", "authenticated", "blocked")).toBeNull();
    expect(resolveBlockedRedirect("/admin/promociones", "authenticated", "blocked")).toBeNull();
  });

  it("no debería bloquear con servicio activo, en prueba o en mora",
  () =>
  {
    expect(resolveBlockedRedirect("/dashboard", "authenticated", "active")).toBeNull();
    expect(resolveBlockedRedirect("/dashboard", "authenticated", "trial")).toBeNull();
    expect(resolveBlockedRedirect("/dashboard", "authenticated", "past_due")).toBeNull();
  });
});

describe("resolveAccessRedirect",
() =>
{
  it("debería dar precedencia al bloqueo sobre la regla de la raíz",
  () =>
  {
    expect(resolveAccessRedirect("/", snapshot({
      session: "authenticated",
      subscription: "blocked",
      hasBusiness: true,
    }))).toBe(ADQUIRIR_SERVICIO_ROUTE);
  });

  it("debería llevar la raíz al dashboard cuando no hay bloqueo",
  () =>
  {
    expect(resolveAccessRedirect("/", snapshot({
      session: "authenticated",
      subscription: "active",
      hasBusiness: true,
    }))).toBe("/dashboard");
  });

  it("debería dejar pasar al invitado en cualquier ruta",
  () =>
  {
    expect(resolveAccessRedirect("/", snapshot())).toBeNull();
    expect(resolveAccessRedirect("/dashboard", snapshot())).toBeNull();
  });
});

describe("isRutaAdquirirServicio / isRutaExentaBloqueo",
() =>
{
  it("debería reconocer la ruta de adquisición",
  () =>
  {
    expect(isRutaAdquirirServicio("/dashboard/suscripcion")).toBe(true);
    expect(isRutaAdquirirServicio("/dashboard/suscripcion/extra")).toBe(false);
  });

  it("debería marcar exentas adquisición, login, auth y legales",
  () =>
  {
    expect(isRutaExentaBloqueo("/dashboard/suscripcion")).toBe(true);
    expect(isRutaExentaBloqueo("/login")).toBe(true);
    expect(isRutaExentaBloqueo("/login?error=x")).toBe(false);
    expect(isRutaExentaBloqueo("/auth/callback")).toBe(true);
    expect(isRutaExentaBloqueo("/admin")).toBe(true);
    expect(isRutaExentaBloqueo("/admin/promociones")).toBe(true);
    expect(isRutaExentaBloqueo("/privacidad")).toBe(true);
    expect(isRutaExentaBloqueo("/terminos")).toBe(true);
    expect(isRutaExentaBloqueo("/dashboard/agenda")).toBe(false);
  });
});
