import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ListaRemarketing, { type ListaItemProps } from "@/components/lista-remarketing";

vi.mock("@/app/dashboard/remarketing/actions", () =>
{
  return {
    marcarRemarketingManual: vi.fn(),
    deshacerRemarketingManual: vi.fn(),
  };
});

const ITEMS: readonly ListaItemProps[] = [
  {
    turnoId: "t-1",
    clienteNombre: "Ana",
    whatsapp: "+5491112345678",
    servicioNombre: "Corte",
    diasObjetivo: 30,
    atrasoDias: 4,
  },
  {
    turnoId: "t-2",
    clienteNombre: "Bruno",
    whatsapp: "+5491199999999",
    servicioNombre: "Color",
    diasObjetivo: 30,
    atrasoDias: 2,
  },
];

function renderLista(): void
{
  render(
    <ListaRemarketing
      items={ITEMS}
      portalUrl={null}
      negocioNombre="Barbería"
      msgRemarketingSubject={null}
      msgRemarketingCuerpo={null}
    />,
  );
}

describe("ListaRemarketing",
() =>
{
  it("debería filtrar mientras se escribe por cliente, WhatsApp o servicio", async () =>
  {
    const user = userEvent.setup();

    renderLista();
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por cliente, WhatsApp o servicio" }),
      "color",
    );

    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.getByText("Bruno")).toBeDefined();
  });

  it("debería avisar cuando la búsqueda no coincide", async () =>
  {
    const user = userEvent.setup();

    renderLista();
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por cliente, WhatsApp o servicio" }),
      "zzz",
    );

    expect(screen.getByRole("status").textContent).toBe("Ningún cliente coincide con la búsqueda.");
  });

  it("debería mantener el aviso original al quedarse sin pendientes", async () =>
  {
    const user = userEvent.setup();

    renderLista();
    await user.click(screen.getAllByRole("button", { name: "Omitir" })[0] as HTMLElement);
    await user.click(screen.getAllByRole("button", { name: "Omitir" })[0] as HTMLElement);

    expect(screen.getByRole("status").textContent)
      .toBe("No hay nadie más para hacer remarketing. Buen trabajo.");
  });
});
