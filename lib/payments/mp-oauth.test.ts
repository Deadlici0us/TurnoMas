import { describe, expect, it, vi } from "vitest";

import {
  buildMpAuthorizeUrl,
  buildMpCallbackUrl,
  codificarMpState,
  decodificarMpState,
  exchangeMpCodeForTokens,
  refreshMpAccessToken,
  sanearNext,
} from "./mp-oauth";

describe("buildMpCallbackUrl",
() =>
{
  it("debería usar NEXT_PUBLIC_APP_URL cuando existe",
  () =>
  {
    const url = buildMpCallbackUrl("http://localhost:3000", { NEXT_PUBLIC_APP_URL: "https://turnomas.com/" });

    expect(url).toBe("https://turnomas.com/api/integrations/mercadopago/callback");
  });

  it("debería caer al origen del request sin env",
  () =>
  {
    const url = buildMpCallbackUrl("http://localhost:3000", {});

    expect(url).toBe("http://localhost:3000/api/integrations/mercadopago/callback");
  });

  it("debería devolver null sin base",
  () =>
  {
    expect(buildMpCallbackUrl(null, {})).toBeNull();
  });
});

describe("buildMpAuthorizeUrl",
() =>
{
  it("debería armar la URL de autorización con client_id, state y redirect",
  () =>
  {
    const url = new URL(buildMpAuthorizeUrl({
      clientId: "123456",
      callbackUrl: "https://turnomas.com/api/integrations/mercadopago/callback",
      state: "negocio-1",
    }));

    expect(url.origin + url.pathname).toBe("https://auth.mercadopago.com/authorization");
    expect(url.searchParams.get("client_id")).toBe("123456");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("platform_id")).toBe("mp");
    expect(url.searchParams.get("state")).toBe("negocio-1");
    expect(url.searchParams.get("redirect_uri"))
      .toBe("https://turnomas.com/api/integrations/mercadopago/callback");
  });
});

describe("codificarMpState / decodificarMpState",
() =>
{
  it("debería roundtripear negocio y destino",
  () =>
  {
    const state = codificarMpState({ negocioId: "neg-1", next: "/onboarding?paso=3" });

    expect(decodificarMpState(state)).toEqual({ negocioId: "neg-1", next: "/onboarding?paso=3" });
  });

  it("debería aceptar state sin destino",
  () =>
  {
    const state = codificarMpState({ negocioId: "neg-1", next: null });

    expect(decodificarMpState(state)).toEqual({ negocioId: "neg-1", next: null });
  });

  it("debería devolver null con state inválido o ajeno",
  () =>
  {
    expect(decodificarMpState("neg-1")).toBeNull();
    expect(decodificarMpState("")).toBeNull();
    expect(decodificarMpState("!!!")).toBeNull();
    expect(decodificarMpState(codificarMpState({ negocioId: "  ", next: null }))).toBeNull();
  });
});

describe("sanearNext",
() =>
{
  it("debería aceptar rutas internas",
  () =>
  {
    expect(sanearNext("/onboarding?paso=3")).toBe("/onboarding?paso=3");
    expect(sanearNext("/dashboard/config")).toBe("/dashboard/config");
  });

  it("debería rechazar URLs externas o raras",
  () =>
  {
    expect(sanearNext(null)).toBeNull();
    expect(sanearNext("")).toBeNull();
    expect(sanearNext("https://evil.com")).toBeNull();
    expect(sanearNext("//evil.com")).toBeNull();
    expect(sanearNext("/\\evil")).toBeNull();
  });
});

describe("exchangeMpCodeForTokens",
() =>
{
  it("debería devolver tokens con code válido",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "APP_USR-abc",
        refresh_token: "TG-xyz",
        expires_in: 15552000,
        user_id: 241983636,
      }),
    });

    const tokens = await exchangeMpCodeForTokens(
      { code: "TG-000", clientId: "cid", clientSecret: "sec", redirectUri: "https://turnomas.com/cb" },
      fetchFn as unknown as typeof fetch,
    );

    expect(tokens.accessToken).toBe("APP_USR-abc");
    expect(tokens.refreshToken).toBe("TG-xyz");
    expect(tokens.userId).toBe("241983636");
    expect(fetchFn).toHaveBeenCalledWith("https://api.mercadopago.com/oauth/token",
      expect.objectContaining({ method: "POST" }));
  });

  it("debería fallar si MercadoPago rechaza el code",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    await expect(exchangeMpCodeForTokens(
      { code: "mal", clientId: "cid", clientSecret: "sec", redirectUri: "https://x/cb" },
      fetchFn as unknown as typeof fetch,
    )).rejects.toThrow("MercadoPago rechazó");
  });

  it("debería fallar sin access_token en la respuesta",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    await expect(exchangeMpCodeForTokens(
      { code: "TG-000", clientId: "cid", clientSecret: "sec", redirectUri: "https://x/cb" },
      fetchFn as unknown as typeof fetch,
    )).rejects.toThrow("Respuesta inválida");
  });
});

describe("refreshMpAccessToken",
() =>
{
  it("debería devolver tokens nuevos con refresh válido",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "APP_USR-nuevo", refresh_token: "TG-nuevo" }),
    });

    const tokens = await refreshMpAccessToken(
      { refreshToken: "TG-viejo", clientId: "cid", clientSecret: "sec" },
      fetchFn as unknown as typeof fetch,
    );

    expect(tokens.accessToken).toBe("APP_USR-nuevo");
    expect(tokens.refreshToken).toBe("TG-nuevo");
  });

  it("debería fallar si el refresh fue revocado",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    await expect(refreshMpAccessToken(
      { refreshToken: "TG-revocado", clientId: "cid", clientSecret: "sec" },
      fetchFn as unknown as typeof fetch,
    )).rejects.toThrow("revocada");
  });
});
