import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ResenaPage from "./page";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("next/navigation", () =>
{
  return {
    notFound: () =>
    {
      throw new Error("NEXT_NOT_FOUND");
    },
  };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);

function stubTurno(data: unknown): void
{
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data }),
        }),
      }),
    }),
  } as never);
}

function params(turnoId: string)
{
  return Promise.resolve({ turnoId });
}

describe("ResenaPage",
() =>
{
  it("debería titular con el negocio",
  async () =>
  {
    stubTurno({ negocio: { nombre: "Barbería" }, servicio: { nombre: "Corte" } });

    render(await ResenaPage({ params: params("t-1") }));

    expect(screen.getByRole("heading", { name: "¿Cómo te fue en Barbería?" })).toBeDefined();
  });

  it("debería usar el título genérico sin nombre",
  async () =>
  {
    stubTurno({ negocio: null, servicio: null });

    render(await ResenaPage({ params: params("t-1") }));

    expect(screen.getByRole("heading", { name: "Calificá tu turno" })).toBeDefined();
  });

  it("debería responder 404 sin turno",
  async () =>
  {
    stubTurno(null);

    await expect(ResenaPage({ params: params("missing") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("debería responder 404 cuando la base falla",
  async () =>
  {
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("db caída");
    });

    await expect(ResenaPage({ params: params("t-1") })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
