import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import middleware from "./middleware";

describe("middleware",
() =>
{
  it("debería propagar el locale es-AR al request",
  () =>
  {
    const response = middleware(new NextRequest("http://localhost/agenda"));

    expect(response.headers.get("x-middleware-override-headers")).toContain("x-next-intl-locale");
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe("es-AR");
  });

  it("debería dejar pasar la respuesta",
  () =>
  {
    const response = middleware(new NextRequest("http://localhost/"));

    expect(response.status).toBe(200);
  });
});
