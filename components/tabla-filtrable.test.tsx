import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TablaFiltrable from "@/components/tabla-filtrable";

const FILAS = [
  {
    key: "1",
    busqueda: ["Juan", "Corte", "Pendiente"],
    contenido: <tr><td>Juan</td></tr>,
  },
  {
    key: "2",
    busqueda: ["Ana", "Color", "Pagado"],
    contenido: <tr><td>Ana</td></tr>,
  },
] as const;

const ENCABEZADOS = <tr><th>Cliente</th></tr>;

describe("TablaFiltrable",
() =>
{
  it("debería mostrar todas las filas al inicio",
  () =>
  {
    render(
      <TablaFiltrable
        filas={FILAS}
        encabezados={ENCABEZADOS}
        placeholder="Buscar movimiento"
        vacioSinDatos="Sin movimientos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    expect(screen.getByText("Juan")).toBeDefined();
    expect(screen.getByText("Ana")).toBeDefined();
  });

  it("debería filtrar por cualquiera de los campos",
  async () =>
  {
    const user = userEvent.setup();

    render(
      <TablaFiltrable
        filas={FILAS}
        encabezados={ENCABEZADOS}
        placeholder="Buscar movimiento"
        vacioSinDatos="Sin movimientos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Buscar movimiento" }), "pagado");

    expect(screen.queryByText("Juan")).toBeNull();
    expect(screen.getByText("Ana")).toBeDefined();
  });

  it("debería avisar cuando no hay coincidencias", async () =>
  {
    const user = userEvent.setup();

    render(
      <TablaFiltrable
        filas={FILAS}
        encabezados={ENCABEZADOS}
        placeholder="Buscar movimiento"
        vacioSinDatos="Sin movimientos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Buscar movimiento" }), "zzz");

    expect(screen.getByRole("status").textContent).toBe("Sin coincidencias");
  });

  it("debería mostrar sin datos y ocultar el buscador", () =>
  {
    render(
      <TablaFiltrable
        filas={[]}
        encabezados={ENCABEZADOS}
        placeholder="Buscar movimiento"
        vacioSinDatos="Sin movimientos"
        vacioSinCoincidencias="Sin coincidencias"
      />,
    );

    expect(screen.getByRole("status").textContent).toBe("Sin movimientos");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
