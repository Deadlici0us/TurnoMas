import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/access", () => ({ resolveAccess: vi.fn() }));

import proxy from "./proxy";
import { resolveAccess } from "@/lib/auth/access";
import type { AccessSnapshot } from "@/lib/auth/route-guard";

const mockAccess = vi.mocked(resolveAccess);

let snapshot: AccessSnapshot = { session: "guest", subscription: "trial", hasBusiness: false };

beforeEach(() =>
{
  vi.clearAllMocks();
  snapshot = { session: "guest", subscription: "trial", hasBusiness: false };
  mockAccess.mockImplementation(async (_request, headers) => ({
    snapshot,
    response: NextResponse.next({ request: { headers } }),
  }));
});

describe("proxy",
() =>
{
  it("debería propagar el locale es-AR al request",
  async () =>
  {
    const response = await proxy(new NextRequest("http://localhost/agenda"));

    expect(response.headers.get("x-middleware-override-headers")).toContain("x-next-intl-locale");
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe("es-AR");
  });

  it("debería dejar pasar al invitado",
  async () =>
  {
    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.status).toBe(200);
  });

  it("debería llevar la raíz al dashboard con sesión y negocio",
  async () =>
  {
    snapshot = { session: "authenticated", subscription: "active", hasBusiness: true };
    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("debería llevar la raíz a onboarding con sesión sin negocio",
  async () =>
  {
    snapshot = { session: "authenticated", subscription: "trial", hasBusiness: false };
    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.headers.get("location")).toBe("http://localhost/onboarding");
  });

  it("debería redirigir al bloqueado a adquirir servicio",
  async () =>
  {
    snapshot = { session: "authenticated", subscription: "blocked", hasBusiness: true };
    const response = await proxy(new NextRequest("http://localhost/dashboard/agenda"));

    expect(response.headers.get("location"))
      .toBe("http://localhost/dashboard/facturacion");
  });

  it("debería permitir la ruta de adquisición al bloqueado",
  async () =>
  {
    snapshot = { session: "authenticated", subscription: "blocked", hasBusiness: true };
    const response = await proxy(new NextRequest("http://localhost/dashboard/facturacion"));

    expect(response.status).toBe(200);
  });
});
