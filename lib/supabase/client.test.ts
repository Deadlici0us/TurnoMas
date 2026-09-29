import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseBrowser } from "./client";

vi.mock("@supabase/ssr", () =>
{
  return { createBrowserClient: vi.fn((url: string, key: string) => ({ url, key })) };
});

const mockCreateBrowserClient = vi.mocked(createBrowserClient);

describe("getSupabaseBrowser",
() =>
{
  beforeEach(() =>
  {
    vi.unstubAllEnvs();
    mockCreateBrowserClient.mockClear();
  });

  it("debería crear el cliente con URL y clave del entorno",
  () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");

    const client = getSupabaseBrowser() as unknown as { url: string; key: string };

    expect(client).toEqual({ url: "https://xyz.supabase.co", key: "sb_publishable_123" });
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://xyz.supabase.co",
      "sb_publishable_123",
    );
  });

  it("debería recortar espacios de las variables",
  () =>
  {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://xyz.supabase.co  ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");

    const client = getSupabaseBrowser() as unknown as { url: string; key: string };

    expect(client.url).toBe("https://xyz.supabase.co");
  });

  it("debería lanzar cuando falta configuración",
  () =>
  {
    expect(() => getSupabaseBrowser()).toThrow(
      "Falta configurar Supabase en el entorno (URL y clave pública).",
    );
    expect(mockCreateBrowserClient).not.toHaveBeenCalled();
  });
});
