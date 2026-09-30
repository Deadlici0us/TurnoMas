import { describe, expect, it, vi } from "vitest";

import {
  buildGoogleAuthorizeUrl,
  buildGoogleCallbackUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from "./google-oauth";

describe("buildGoogleCallbackUrl",
() =>
{
  it("debería usar NEXT_PUBLIC_APP_URL cuando existe",
  () =>
  {
    const url = buildGoogleCallbackUrl("http://localhost:3000", { NEXT_PUBLIC_APP_URL: "https://turnomas.com/" });

    expect(url).toBe("https://turnomas.com/api/integrations/google/callback");
  });

  it("debería caer al origen del request sin env",
  () =>
  {
    const url = buildGoogleCallbackUrl("http://localhost:3000", {});

    expect(url).toBe("http://localhost:3000/api/integrations/google/callback");
  });

  it("debería devolver null sin base",
  () =>
  {
    expect(buildGoogleCallbackUrl(null, {})).toBeNull();
  });
});

describe("buildGoogleAuthorizeUrl",
() =>
{
  it("debería pedir offline y consent para obtener refresh_token",
  () =>
  {
    const url = new URL(buildGoogleAuthorizeUrl({
      clientId: "cid",
      callbackUrl: "https://turnomas.com/api/integrations/google/callback",
      state: "negocio-1",
    }));

    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain("calendar.events");
    expect(url.searchParams.get("state")).toBe("negocio-1");
  });
});

describe("exchangeCodeForTokens",
() =>
{
  it("debería devolver tokens con code válido",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.x", refresh_token: "1//y", expires_in: 3599 }),
    });

    const tokens = await exchangeCodeForTokens(
      { code: "code", clientId: "cid", clientSecret: "sec", redirectUri: "https://turnomas.com/cb" },
      fetchFn as unknown as typeof fetch,
    );

    expect(tokens.accessToken).toBe("ya29.x");
    expect(tokens.refreshToken).toBe("1//y");
  });

  it("debería fallar si Google rechaza el code",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    await expect(exchangeCodeForTokens(
      { code: "mal", clientId: "cid", clientSecret: "sec", redirectUri: "https://x/cb" },
      fetchFn as unknown as typeof fetch,
    )).rejects.toThrow("Google rechazó");
  });
});

describe("refreshAccessToken",
() =>
{
  it("debería devolver un access_token nuevo",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.nuevo" }),
    });

    const token = await refreshAccessToken(
      { refreshToken: "1//y", clientId: "cid", clientSecret: "sec" },
      fetchFn as unknown as typeof fetch,
    );

    expect(token).toBe("ya29.nuevo");
  });
});
