import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import RegisterPage from "./page";

vi.mock("next-intl/server", () =>
{
  return { getTranslations: async () => (key: string) => key };
});

vi.mock("./actions", () =>
{
  return { register: vi.fn(async () => undefined) };
});

vi.mock("@/lib/supabase/client", () =>
{
  return {
    getSupabaseBrowser: () => ({
      auth: { signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })) },
    }),
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

describe("RegisterPage",
() =>
{
  it("debería mostrar el formulario sin social en modo demo",
  async () =>
  {
    render(await RegisterPage({ searchParams: params() }));

    expect(screen.getByText("auth.registerTitle")).toBeDefined();
    expect(screen.getByRole("button", { name: "auth.registerCta" })).toBeDefined();
    expect(screen.queryByText("auth.googleTitle")).toBeNull();
  });

  it("debería mostrar errores conocidos traducidos",
  async () =>
  {
    for (const [param, key] of [["datos", "auth.invalidData"], ["registro", "auth.registerError"]] as const)
    {
      const { unmount } = render(await RegisterPage({ searchParams: params(param) }));

      expect(screen.getByRole("alert")).toHaveTextContent(key);
      unmount();
    }
  });

  it("debería ocultar errores desconocidos",
  async () =>
  {
    render(await RegisterPage({ searchParams: params("otro") }));

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("debería mostrar login social en modo supabase",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");

    render(await RegisterPage({ searchParams: params() }));

    expect(screen.getByText("auth.googleTitle")).toBeDefined();
  });

  it("debería enlazar al login",
  async () =>
  {
    render(await RegisterPage({ searchParams: params() }));

    expect(screen.getByRole("link", { name: "auth.toLogin" })).toHaveAttribute("href", "/login");
  });
});
