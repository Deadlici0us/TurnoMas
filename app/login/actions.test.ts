import { beforeEach, describe, expect, it, vi } from "vitest";

import { login, logout } from "./actions";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/headers", () =>
{
  return { cookies: vi.fn() };
});

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

import { cookies } from "next/headers";

const mockCookies = vi.mocked(cookies);
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

function modoSupabase(): void
{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
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

  it("debería iniciar demo local con cookie",
  async () =>
  {
    const set = vi.fn();
    mockCookies.mockResolvedValue({ set } as never);

    await expect(login(formulario({ email: "a@b.com", password: "x" })))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(set).toHaveBeenCalledWith("session", "demo", expect.objectContaining({ path: "/" }));
  });

  it("debería iniciar la demo temporal sin llamar a Supabase",
  async () =>
  {
    modoSupabase();
    const set = vi.fn();
    mockCookies.mockResolvedValue({ set } as never);

    await expect(login(formulario({ email: "demo@turnomas.com", password: "demo123" })))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(set).toHaveBeenCalledWith("session", "demo", expect.objectContaining({ path: "/" }));
    expect(mockServer).not.toHaveBeenCalled();
  });

  it("debería pedir credenciales cuando Supabase rechaza",
  async () =>
  {
    modoSupabase();
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
    modoSupabase();
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
    modoSupabase();
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
  it("debería borrar la cookie demo local",
  async () =>
  {
    const del = vi.fn();
    mockCookies.mockResolvedValue({ delete: del } as never);

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(del).toHaveBeenCalledWith("session");
  });

  it("debería borrar la cookie demo y cerrar sesión Supabase",
  async () =>
  {
    modoSupabase();
    const del = vi.fn();
    mockCookies.mockResolvedValue({ delete: del } as never);
    const signOut = vi.fn(async () => ({}));
    mockServer.mockResolvedValue({ auth: { signOut } } as never);

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(del).toHaveBeenCalledWith("session");
    expect(signOut).toHaveBeenCalledOnce();
  });
});
