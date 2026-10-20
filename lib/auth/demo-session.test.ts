import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () =>
{
  return { cookies: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { esCookieDemo, tieneCookieDemo } from "./demo-cookie";
import { esSesionDemo, leerSesionDemo } from "./demo-session";

const mockCookies = vi.mocked(cookies);
const mockServer = vi.mocked(getSupabaseServer);

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("demo-cookie",
() =>
{
  it("debería reconocer el valor demo", () =>
  {
    expect(esCookieDemo("demo")).toBe(true);
    expect(esCookieDemo("otro")).toBe(false);
    expect(esCookieDemo(undefined)).toBe(false);
  });

  it("debería leer la cookie sin romper fuera de un request", async () =>
  {
    mockCookies.mockResolvedValue({
      get: () => ({ value: "demo" }),
    } as never);

    await expect(tieneCookieDemo()).resolves.toBe(true);

    mockCookies.mockRejectedValueOnce(new Error("sin request"));
    await expect(tieneCookieDemo()).resolves.toBe(false);
  });
});

describe("leerSesionDemo",
() =>
{
  it("debería priorizar la cookie demo y no llamar a Supabase", async () =>
  {
    mockCookies.mockResolvedValue({ get: () => ({ value: "demo" }) } as never);

    const sesion = await leerSesionDemo();

    expect(sesion).toEqual({ esDemo: true, userId: null, email: null });
    expect(mockServer).not.toHaveBeenCalled();
  });

  it("debería reconocer una sesión Supabase heredada del dueño demo", async () =>
  {
    mockCookies.mockResolvedValue({ get: () => undefined } as never);
    mockServer.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u-1", email: "demo@turnomas.com" } },
        }),
      },
    } as never);

    const sesion = await leerSesionDemo();

    expect(sesion.esDemo).toBe(true);
    expect(sesion.userId).toBe("u-1");
  });

  it("debería devolver usuario real sin marcar demo", async () =>
  {
    mockCookies.mockResolvedValue({ get: () => undefined } as never);
    mockServer.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u-2", email: "dueno@negocio.com" } },
        }),
      },
    } as never);

    await expect(esSesionDemo()).resolves.toBe(false);
  });
});
