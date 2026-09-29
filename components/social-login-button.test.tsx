import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SocialLoginButton from "@/components/social-login-button";

const signInWithOAuth = vi.fn(
  async (): Promise<{ data: object; error: Error | null }> => ({ data: {}, error: null }),
);

vi.mock("@/lib/supabase/client", () =>
{
  return {
    getSupabaseBrowser: () => ({
      auth: { signInWithOAuth },
    }),
  };
});

describe("SocialLoginButton",
() =>
{
  it("debería renderizar el botón de Google",
  () =>
  {
    render(<SocialLoginButton label="Continuar con Google" />);
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeDefined();
  });

  it("debería llamar a signInWithOAuth con Google y callback al hacer click",
  async () =>
  {
    const user = userEvent.setup();
    signInWithOAuth.mockClear();

    render(<SocialLoginButton label="Continuar con Google" />);
    await user.click(screen.getByRole("button", { name: "Continuar con Google" }));

    expect(signInWithOAuth).toHaveBeenCalledOnce();
    const calls = signInWithOAuth.mock.calls as unknown[];
    const callArgs = calls[0] as unknown[];
    const args = callArgs[0] as {
      provider: string;
      options: { redirectTo: string };
    };

    expect(args.provider).toBe("google");
    expect(args.options.redirectTo.endsWith("/auth/callback")).toBe(true);
  });

  it("debería mostrar error cuando OAuth falla",
  async () =>
  {
    const user = userEvent.setup();
    signInWithOAuth.mockResolvedValueOnce({ data: {}, error: new Error("oauth") });

    render(
      <SocialLoginButton
        label="Continuar con Google"
        errorLabel="No pudimos iniciar con Google. Probá de nuevo"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Continuar con Google" }));

    expect(
      await screen.findByText("No pudimos iniciar con Google. Probá de nuevo"),
    ).toBeDefined();
  });
});
