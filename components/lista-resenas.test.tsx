import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ListaResenas, { type ResenaItem } from "@/components/lista-resenas";

vi.mock("@/app/dashboard/resenas/actions", () =>
{
  return { marcarResenaResuelta: vi.fn() };
});

const ITEMS: readonly ResenaItem[] = [
  {
    id: "r-1",
    estrellas: 5,
    comentario: "Excelente atención",
    resuelto: false,
    fecha: "2026-10-01T12:00:00.000Z",
    cliente: "Ana",
    whatsapp: "+5491112345678",
    servicio: "Corte",
  },
  {
    id: "r-2",
    estrellas: 2,
    comentario: "Llegué tarde",
    resuelto: false,
    fecha: "2026-10-02T12:00:00.000Z",
    cliente: "Bruno",
    whatsapp: "+5491199999999",
    servicio: "Color",
  },
];

function renderLista(): void
{
  render(<ListaResenas items={ITEMS} negocioNombre="Barbería" />);
}

describe("ListaResenas",
() =>
{
  it("debería filtrar mientras se escribe por cliente, servicio o comentario", async () =>
  {
    const user = userEvent.setup();

    renderLista();
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por cliente, servicio o comentario" }),
      "color",
    );

    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.getByText("Bruno")).toBeDefined();
  });

  it("debería combinar la búsqueda con el filtro de estrellas", async () =>
  {
    const user = userEvent.setup();

    renderLista();
    await user.click(screen.getByRole("button", { name: "Buenas (4-5★)" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por cliente, servicio o comentario" }),
      "bruno",
    );

    expect(screen.getByRole("status").textContent)
      .toBe("No hay reseñas que coincidan con la búsqueda.");
  });

  it("debería mantener el aviso original sin búsqueda", async () =>
  {
    const user = userEvent.setup();

    render(<ListaResenas items={[ITEMS[0] as ResenaItem]} negocioNombre="Barbería" />);
    await user.click(screen.getByRole("button", { name: "Malas (1-3★)" }));

    expect(screen.getByRole("status").textContent).toBe("No hay reseñas para este filtro.");
  });
});
