import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { withRedirectAction } from "./with-redirect-action";

const redirect = vi.hoisted(() => vi.fn());
const unstableRethrow = vi.hoisted(() => vi.fn((error: unknown) =>
{
  if (error instanceof Error && (error as Error & { digest?: string }).digest?.startsWith("NEXT_") === true)
  {
    throw error;
  }
}));

vi.mock("next/navigation", () =>
{
  return { redirect, unstable_rethrow: unstableRethrow };
});

describe("withRedirectAction",
() =>
{
  beforeEach(() =>
  {
    redirect.mockClear();
    unstableRethrow.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() =>
  {
    vi.restoreAllMocks();
  });

  it("debería ejecutar la acción y devolver su resultado",
  async () =>
  {
    const action = withRedirectAction("login", async (email: string) => email, "/login?error=inesperado");

    await expect(action("a@b.com")).resolves.toBe("a@b.com");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("debería redirigir ante un error inesperado",
  async () =>
  {
    const action = withRedirectAction("login", async () =>
    {
      throw new Error("fallo");
    }, "/login?error=inesperado");

    await action();
    expect(redirect).toHaveBeenCalledWith("/login?error=inesperado");
  });

  it("debería preservar los redirects internos de Next",
  async () =>
  {
    const nextRedirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    const action = withRedirectAction("login", async () =>
    {
      throw nextRedirect;
    }, "/login?error=inesperado");

    await expect(action()).rejects.toBe(nextRedirect);
    expect(redirect).not.toHaveBeenCalled();
  });
});
