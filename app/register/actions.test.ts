import { beforeEach, describe, expect, it, vi } from "vitest";

import { register } from "./actions";
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

function formularioValido(): FormData
{
  return formulario({ business: "Barbería", email: "a@b.com", password: "secreto1" });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("register",
() =>
{
  it("debería pedir datos válidos",
  async () =>
  {
    await expect(register(formulario({ business: "x", email: "", password: "123" })))
      .rejects.toThrow("NEXT_REDIRECT:/register?error=datos");
  });

  it("debería pedir reintento cuando Supabase rechaza",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { signUp: async () => ({ error: { message: "existe" } }) },
    } as never);

    await expect(register(formularioValido()))
      .rejects.toThrow("NEXT_REDIRECT:/register?error=registro");
  });

  it("debería ir al onboarding con registro ok",
  async () =>
  {
    const signUp = vi.fn(async () => ({ error: null }));
    mockServer.mockResolvedValue({ auth: { signUp } } as never);

    await expect(register(formularioValido())).rejects.toThrow("NEXT_REDIRECT:/onboarding");
    expect(signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secreto1",
      options: { data: { business_name: "Barbería" } },
    });
  });
});
