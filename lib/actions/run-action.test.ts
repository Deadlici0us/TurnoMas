import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "@/lib/errors/conflict-error";
import { runAction } from "./run-action";

const unstableRethrow = vi.hoisted(() => vi.fn((error: unknown) =>
{
  if (error instanceof Error && (error as Error & { digest?: string }).digest?.startsWith("NEXT_") === true)
  {
    throw error;
  }
}));

vi.mock("next/navigation", () =>
{
  return { unstable_rethrow: unstableRethrow };
});

describe("runAction",
() =>
{
  beforeEach(() =>
  {
    unstableRethrow.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() =>
  {
    vi.restoreAllMocks();
  });

  it("debería devolver los datos de una acción exitosa",
  async () =>
  {
    const result = await runAction("crear", async () => ({ id: "1" }));

    expect(result).toEqual({ ok: true, data: { id: "1" } });
  });

  it("debería devolver un fallo tipado para AppError",
  async () =>
  {
    const result = await runAction("eliminar", async () =>
    {
      throw new ConflictError("Tiene historial", "staff_con_historial");
    });

    expect(result).toEqual({
      ok: false,
      code: "staff_con_historial",
      error: "Tiene historial",
    });
  });

  it("debería ocultar el mensaje de un error inesperado",
  async () =>
  {
    const result = await runAction("crear", async () =>
    {
      throw new Error("detalle interno");
    });

    expect(result).toEqual({
      ok: false,
      code: "UNEXPECTED",
      error: "Ocurrió un error inesperado. Probá de nuevo.",
    });
  });

  it("debería re-lanzar los errores de navegación de Next",
  async () =>
  {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });

    await expect(runAction("login", async () => { throw redirect; })).rejects.toBe(redirect);
  });
});
