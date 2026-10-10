import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import LeyendaEstados from "./leyenda-estados";
import { LEYENDA_ESTADOS } from "@/lib/dashboard/estados-colores";

describe("LeyendaEstados",
() =>
{
  it("debería listar los estados base con etiqueta accesible",
  () =>
  {
    render(<LeyendaEstados />);
    const leyenda = screen.getByLabelText("Significado de los colores");

    expect(leyenda.children.length).toBe(LEYENDA_ESTADOS.length);
    expect(screen.getByText(LEYENDA_ESTADOS[0]?.titulo ?? "")).toBeDefined();
  });

  it("debería agregar el estado externo cuando se pide",
  () =>
  {
    render(<LeyendaEstados incluirExterno />);
    const leyenda = screen.getByLabelText("Significado de los colores");

    expect(leyenda.children.length).toBe(LEYENDA_ESTADOS.length + 1);
  });
});
