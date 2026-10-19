import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";

import Panel from "./panel";

describe("Panel",
() =>
{
  it("debería renderizar título, descripción y acciones",
  () =>
  {
    render(
      <Panel
        title="Próximos turnos"
        description="Tu día de un vistazo"
        actions={<Link href="/dashboard/agenda">Ver agenda</Link>}
      >
        <p>Contenido</p>
      </Panel>,
    );

    expect(screen.getByRole("heading", { name: "Próximos turnos" })).toBeDefined();
    expect(screen.getByText("Tu día de un vistazo")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver agenda" })).toBeDefined();
    expect(screen.getByText("Contenido")).toBeDefined();
  });

  it("debería permitir un panel sin encabezado",
  () =>
  {
    render(<Panel><p>Solo contenido</p></Panel>);

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Solo contenido")).toBeDefined();
  });
});
