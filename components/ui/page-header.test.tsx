import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import PageHeader from "./page-header";

describe("PageHeader",
() =>
{
  it("debería mostrar las acciones debajo del subtítulo",
  () =>
  {
    const { container } = render(
      <PageHeader
        title="Agenda"
        subtitle="Organizá tus turnos."
        actions={<button type="button">Derecha</button>}
        actionsBelow={<button type="button">Debajo</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Agenda" })).toBeDefined();
    expect(screen.getByText("Organizá tus turnos.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Debajo" })).toBeDefined();

    const subtitulo = screen.getByText("Organizá tus turnos.");
    const debajo = screen.getByRole("button", { name: "Debajo" }).parentElement;

    expect(subtitulo.nextElementSibling).toBe(debajo);
    expect(container.textContent).toContain("Derecha");
  });
});
