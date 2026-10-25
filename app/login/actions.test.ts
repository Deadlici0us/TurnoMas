import { beforeEach, describe, expect, it, vi } from "vitest";

import { login, logout } from "./actions";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/navigation", () =>
{
  return {
    redirect: (url: string): never =>
    {
      throw new Error(`NEXT_REDIRECT:${url}`);
    },
  };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

const mockServer = vi.mocked(getSupabaseServer);

function formulario(entries: Record<string, string>): FormData
{
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries))
  {
    formData.append(key, value);
  }

  return formData;
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("login",
() =>
{
  it("debería pedir credenciales vacías",
  async () =>
  {
    await expect(login(formulario({ email: "", password: "" })))
      .rejects.toThrow("NEXT_REDIRECT:/login?error=credenciales");
  });

  it("debería pedir credenciales cuando Supabase rechaza",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: {
        signInWithPassword: async () => ({ error: { message: "mal" } }),
        getUser: async () => ({ data: { user: null } }),
      },
    } as never);

    await expect(login(formulario({ email: "a@b.com", password: "x" })))
      .rejects.toThrow("NEXT_REDIRECT:/login?error=credenciales");
  });

  it("debería ir al onboarding sin negocio",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: {
        signInWithPassword: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null }),
          }),
        }),
      }),
    } as never);

    await expect(login(formulario({ email: "a@b.com", password: "x" })))
      .rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("debería ir al dashboard con negocio",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: {
        signInWithPassword: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "neg-1" } }),
          }),
        }),
      }),
    } as never);

    await expect(login(formulario({ email: "a@b.com", password: "x" })))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });
});

describe("logout",
() =>
{
  it("debería cerrar sesión Supabase",
  async () =>
  {
    const signOut = vi.fn(async () => ({}));
    mockServer.mockResolvedValue({ auth: { signOut } } as never);

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(signOut).toHaveBeenCalledOnce();
  });
});
