import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SocialLoginButton from "@/components/social-login-button";
import type { GoogleInitializeConfig } from "@/lib/auth/google-identity";

const { signInWithIdToken, replace } = vi.hoisted(() =>
{
  return { signInWithIdToken: vi.fn(), replace: vi.fn() };
});

vi.mock("@/lib/supabase/client", () =>
{
  return {
    getSupabaseBrowser: () => ({
      auth: { signInWithIdToken },
    }),
  };
});

vi.mock("next/navigation", () =>
{
  return { useRouter: () => ({ replace }) };
});

vi.mock("@/lib/auth/google-identity", async (importOriginal) =>
{
  const actual = await importOriginal<typeof import("@/lib/auth/google-identity")>();

  return {
    ...actual,
    createNoncePair: vi.fn(async () => ({ raw: "raw-nonce", hashed: "hashed-nonce" })),
  };
});

const initialize = vi.fn();
const renderButton = vi.fn();
const cancel = vi.fn();

beforeEach(() =>
{
  vi.clearAllMocks();
  signInWithIdToken.mockResolvedValue({ data: {}, error: null });
  window.google = {
    accounts: {
      id: { initialize, renderButton, cancel },
    },
  };
});

afterEach(() =>
{
  delete (window as { google?: unknown }).google;
});

describe("SocialLoginButton",
() =>
{
  it("debería renderizar el contenedor accesible de Google",
  () =>
  {
    render(<SocialLoginButton label="Continuar con Google" clientId="client-1" />);

    expect(screen.getByLabelText("Continuar con Google")).toBeDefined();
  });

  it("debería inicializar GIS y canjear el ID token en Supabase",
  async () =>
  {
    render(<SocialLoginButton label="Continuar con Google" clientId="client-1" />);

    await waitFor(() => expect(initialize).toHaveBeenCalledOnce());

    const config = initialize.mock.calls[0]?.[0] as GoogleInitializeConfig;

    expect(config.client_id).toBe("client-1");
    expect(config.nonce).toBe("hashed-nonce");
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ text: "continue_with", size: "large" }),
    );

    act(() =>
    {
      config.callback({ credential: "credential-1" });
    });

    await waitFor(() => expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "credential-1",
      nonce: "raw-nonce",
    }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("debería respetar el destino next saneado",
  async () =>
  {
    render(<SocialLoginButton label="Continuar con Google" next="/dashboard/agenda" clientId="client-1" />);

    await waitFor(() => expect(initialize).toHaveBeenCalledOnce());

    const config = initialize.mock.calls[0]?.[0] as GoogleInitializeConfig;

    act(() =>
    {
      config.callback({ credential: "credential-1" });
    });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/agenda"));
  });

  it("debería mostrar error cuando Supabase rechaza el token",
  async () =>
  {
    signInWithIdToken.mockResolvedValueOnce({ data: {}, error: new Error("oauth") });

    render(
      <SocialLoginButton
        label="Continuar con Google"
        errorLabel="No pudimos iniciar con Google. Probá de nuevo"
        clientId="client-1"
      />,
    );

    await waitFor(() => expect(initialize).toHaveBeenCalledOnce());

    const config = initialize.mock.calls[0]?.[0] as GoogleInitializeConfig;

    act(() =>
    {
      config.callback({ credential: "credential-1" });
    });

    expect(
      await screen.findByText("No pudimos iniciar con Google. Probá de nuevo"),
    ).toBeDefined();
  });

  it("debería mostrar error cuando falta el Client ID",
  async () =>
  {
    render(
      <SocialLoginButton
        label="Continuar con Google"
        errorLabel="No pudimos iniciar con Google. Probá de nuevo"
        clientId=""
      />,
    );

    expect(
      await screen.findByText("No pudimos iniciar con Google. Probá de nuevo"),
    ).toBeDefined();
  });
});
