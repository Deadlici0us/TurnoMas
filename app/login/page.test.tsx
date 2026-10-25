import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import LoginPage from "./page";

vi.mock("next-intl/server", () =>
{
  return { getTranslations: async () => (key: string) => key };
});

vi.mock("./actions", () =>
{
  return { login: vi.fn(async () => undefined) };
});

vi.mock("@/components/social-login-button", () =>
{
  return {
    default: ({ label }: { readonly label: string }) => <div aria-label={label} />,
  };
});

function params(error?: string)
{
  return Promise.resolve(error === undefined ? {} : { error });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
});

describe("LoginPage",
() =>
{
  it("debería mostrar el formulario sin social sin Supabase configurado",
  async () =>
  {
    render(await LoginPage({ searchParams: params() }));

    expect(screen.getByText("auth.loginTitle")).toBeDefined();
    expect(screen.getByRole("button", { name: "auth.loginCta" })).toBeDefined();
    expect(screen.queryByText("auth.googleTitle")).toBeNull();
  });

  it("debería mostrar errores conocidos traducidos",
  async () =>
  {
    for (const [param, key] of [
      ["credenciales", "auth.invalidCredentials"],
      ["oauth", "auth.oauthError"],
      ["sesion", "auth.sessionExpired"],
    ] as const)
    {
      const { unmount } = render(await LoginPage({ searchParams: params(param) }));

      expect(screen.getByRole("alert")).toHaveTextContent(key);
      unmount();
    }
  });

  it("debería ocultar errores desconocidos",
  async () =>
  {
    render(await LoginPage({ searchParams: params("otro") }));

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("debería mostrar login social con Supabase configurado",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");

    render(await LoginPage({ searchParams: params() }));

    expect(screen.getByText("auth.googleTitle")).toBeDefined();
    expect(screen.getByLabelText("auth.continueWithGoogle")).toBeDefined();
  });

  it("debería enlazar al registro",
  async () =>
  {
    render(await LoginPage({ searchParams: params() }));

    expect(screen.getByRole("link", { name: "auth.toRegister" })).toHaveAttribute("href", "/register");
  });

  it("debería enlazar a las páginas legales",
  async () =>
  {
    render(await LoginPage({ searchParams: params() }));

    expect(screen.getByRole("link", { name: "footer.privacy" })).toHaveAttribute("href", "/privacidad");
    expect(screen.getByRole("link", { name: "footer.terms" })).toHaveAttribute("href", "/terminos");
  });
});
