import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ListaFiltrable from "@/components/lista-filtrable";

const ITEMS = [
  { key: "1", busqueda: ["Ana Pérez", "Corte"], contenido: <p>Ana Pérez</p> },
  { key: "2", busqueda: ["Bruno Díaz", "Color"], contenido: <p>Bruno Díaz</p> },
] as const;

describe("ListaFiltrable",
() =>
{
  it("debería mostrar todos los items al inicio",
  () =>
  {
    render(
      <ListaFiltrable
        items={ITEMS}
        placeholder="Buscar cliente"
        vacioSinDatos="Sin datos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    expect(screen.getByText("Ana Pérez")).toBeDefined();
    expect(screen.getByText("Bruno Díaz")).toBeDefined();
  });

  it("debería filtrar mientras se escribe",
  async () =>
  {
    const user = userEvent.setup();

    render(
      <ListaFiltrable
        items={ITEMS}
        placeholder="Buscar cliente"
        vacioSinDatos="Sin datos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "bru");

    expect(screen.queryByText("Ana Pérez")).toBeNull();
    expect(screen.getByText("Bruno Díaz")).toBeDefined();
  });

  it("debería mostrar el aviso de sin coincidencias",
  async () =>
  {
    const user = userEvent.setup();

    render(
      <ListaFiltrable
        items={ITEMS}
        placeholder="Buscar cliente"
        vacioSinDatos="Sin datos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "zzz");

    expect(screen.getByRole("status").textContent).toBe("Sin coincidencias");
  });

  it("debería mostrar el aviso de sin datos y ocultar el buscador",
  () =>
  {
    render(
      <ListaFiltrable
        items={[]}
        placeholder="Buscar cliente"
        vacioSinDatos="Sin datos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    expect(screen.getByRole("status").textContent).toBe("Sin datos");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
