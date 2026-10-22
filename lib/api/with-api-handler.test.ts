import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/errors/not-found-error";
import { withApiHandler } from "./with-api-handler";

vi.mock("next/navigation", () =>
{
  return { unstable_rethrow: vi.fn() };
});

describe("withApiHandler",
() =>
{
  beforeEach(() =>
  {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() =>
  {
    vi.restoreAllMocks();
  });

  it("debería devolver la respuesta original cuando no hay error",
  async () =>
  {
    const handler = withApiHandler("test", async () => NextResponse.json({ ok: true }));
    const response = await handler(new Request("https://turnomas.test/api/test"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("debería traducir un AppError a su estado y código",
  async () =>
  {
    const handler = withApiHandler("test", async () =>
    {
      throw new NotFoundError("No existe");
    });
    const response = await handler(new Request("https://turnomas.test/api/test"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "No existe", code: "NOT_FOUND" });
  });

  it("debería responder 500 genérico ante un error inesperado",
  async () =>
  {
    const handler = withApiHandler("test", async () =>
    {
      throw new Error("detalle interno");
    });
    const response = await handler(new Request("https://turnomas.test/api/test"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Ocurrió un error inesperado. Probá de nuevo.",
      code: "UNEXPECTED",
    });
  });
});
