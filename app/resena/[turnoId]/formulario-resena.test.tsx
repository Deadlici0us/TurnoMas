import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FormularioResena from "./formulario-resena";

/** Instala fetch global mockeado y devuelve el mock. */
function instalarFetch(respuesta: unknown)
{
  const fetchMock = vi.fn(async () => respuesta);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function respuestaOk(json: unknown)
{
  return { ok: true, status: 200, json: async () => json };
}

beforeEach(() =>
{
  vi.unstubAllGlobals();
});

describe("FormularioResena",
() =>
{
  it("debería exigir estrellas antes de enviar",
  async () =>
  {
    const user = userEvent.setup();
    const fetchMock = instalarFetch(respuestaOk({ destino: "feedback-interno" }));

    render(<FormularioResena turnoId="t-1" />);
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(screen.getByText("Elegí de 1 a 5 estrellas.")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debería enviar 5 estrellas con comentario",
  async () =>
  {
    const user = userEvent.setup();
    const fetchMock = instalarFetch(
      respuestaOk({ destino: "google-maps", mapsUrl: "https://maps.example/x" }));

    render(<FormularioResena turnoId="t-1" />);
    await user.click(screen.getByRole("button", { name: "5 estrellas" }));
    await user.type(screen.getByPlaceholderText("Contanos más (opcional)"), "Excelente");
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/resenas", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(
      ((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body,
    ) as { turnoId: string; estrellas: number; comentario: string };

    expect(body).toEqual({ turnoId: "t-1", estrellas: 5, comentario: "Excelente" });
    expect(await screen.findByRole("link", { name: "Dejanos tu reseña en Google" }))
      .toHaveAttribute("href", "https://maps.example/x");
  });

  it("debería agradecer el feedback interno",
  async () =>
  {
    const user = userEvent.setup();
    instalarFetch(respuestaOk({ destino: "feedback-interno" }));

    render(<FormularioResena turnoId="t-1" />);
    await user.click(screen.getByRole("button", { name: "3 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByText("Recibimos tu devolución y la vamos a usar para mejorar. ¡Gracias!"))
      .toBeDefined();
  });

  it("debería mostrar el error del servidor",
  async () =>
  {
    const user = userEvent.setup();
    instalarFetch({ ok: false, status: 400, json: async () => ({ error: "Turno inválido." }) });

    render(<FormularioResena turnoId="t-1" />);
    await user.click(screen.getByRole("button", { name: "4 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByText("Turno inválido.")).toBeDefined();
  });

  it("debería mostrar genérico sin detalle del servidor",
  async () =>
  {
    const user = userEvent.setup();
    instalarFetch({ ok: false, status: 500, json: async () => ({}) });

    render(<FormularioResena turnoId="t-1" />);
    await user.click(screen.getByRole("button", { name: "2 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByText("No pudimos guardar tu calificación.")).toBeDefined();
  });

  it("debería mostrar genérico ante fallas de red",
  async () =>
  {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () =>
    {
      throw new Error("red caída");
    }));

    render(<FormularioResena turnoId="t-1" />);
    await user.click(screen.getByRole("button", { name: "1 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByText("No pudimos guardar tu calificación. Probá de nuevo.")).toBeDefined();
  });
});
