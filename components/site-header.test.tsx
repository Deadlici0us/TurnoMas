import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteHeader from "./site-header";

vi.mock("next-intl/server", () =>
{
  return { getTranslations: async () => (key: string) => key };
});

vi.mock("@/lib/auth/session", () =>
{
  return { getSessionState: vi.fn() };
});

vi.mock("@/lib/dashboard/negocio-header", () =>
{
  return { getNegocioHeader: vi.fn() };
});

vi.mock("@/app/login/actions", () =>
{
  return { logout: vi.fn(async () => undefined) };
});

import { getSessionState } from "@/lib/auth/session";
import { getNegocioHeader } from "@/lib/dashboard/negocio-header";

const mockSession = vi.mocked(getSessionState);
const mockNegocio = vi.mocked(getNegocioHeader);

describe("SiteHeader",
() =>
{
  it("debería mostrar login y registro sin sesión",
  async () =>
  {
    mockSession.mockResolvedValueOnce("guest" as never);

    render(await SiteHeader());

    expect(screen.getByRole("link", { name: "nav.login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "nav.register" })).toHaveAttribute("href", "/register");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("debería mostrar el perfil del negocio autenticado",
  async () =>
  {
    mockSession.mockResolvedValueOnce("authenticated" as never);
    mockNegocio.mockResolvedValueOnce({ nombre: "Barbería Diego", logoUrl: null });

    render(await SiteHeader());

    expect(screen.getByRole("button", { name: "nav.menu" })).toBeDefined();
    expect(screen.getByText("Barbería Diego")).toBeDefined();
    expect(screen.queryByRole("link", { name: "nav.login" })).toBeNull();
  });

  it("debería usar 'Mi cuenta' autenticado sin negocio",
  async () =>
  {
    mockSession.mockResolvedValueOnce("authenticated" as never);
    mockNegocio.mockResolvedValueOnce(null);

    render(await SiteHeader());

    expect(screen.getByText("nav.account")).toBeDefined();
  });

  it("debería mostrar el nombre de la app",
  async () =>
  {
    mockSession.mockResolvedValueOnce("guest" as never);

    render(await SiteHeader());

    expect(screen.getByRole("link", { name: /appName/ })).toHaveAttribute("href", "/");
  });
});
