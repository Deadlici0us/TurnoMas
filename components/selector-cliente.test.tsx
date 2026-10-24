import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SelectorCliente from "./selector-cliente";

const CLIENTES = [
  { id: "cli-zoe", nombre: "Zoe", whatsapp: "+549110000004", email: "zoe@ejemplo.com" },
  { id: "cli-alvaro", nombre: "Álvaro", whatsapp: "+549110000001", email: "alvaro@ejemplo.com" },
  { id: "cli-maria", nombre: "María Gómez", whatsapp: "+549110000002", email: "maria@ejemplo.com" },
  { id: "cli-benito", nombre: "Benito", whatsapp: "+549110000003", email: null },
];

describe("SelectorCliente",
() =>
{
  it("debería listar los clientes en orden alfabético",
  async () =>
  {
    const user = userEvent.setup();

    render(<SelectorCliente clientes={CLIENTES} seleccionadoId="" onElegir={vi.fn()} />);
    await user.click(screen.getByLabelText("Cliente"));

    const opciones = await screen.findAllByRole("option");

    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      expect.stringContaining("Álvaro"),
      expect.stringContaining("Benito"),
      expect.stringContaining("María Gómez"),
      expect.stringContaining("Zoe"),
    ]);
  });

  it("debería filtrar por nombre mientras se escribe",
  async () =>
  {
    const user = userEvent.setup();

    render(<SelectorCliente clientes={CLIENTES} seleccionadoId="" onElegir={vi.fn()} />);
    const buscador = screen.getByLabelText("Cliente");

    await user.click(buscador);
    await user.type(buscador, "mar");

    const opciones = await screen.findAllByRole("option");

    expect(opciones).toHaveLength(1);
    expect(opciones[0]?.textContent).toContain("María Gómez");
  });

  it("debería mostrar WhatsApp y email en cada opción",
  async () =>
  {
    const user = userEvent.setup();

    render(<SelectorCliente clientes={CLIENTES} seleccionadoId="" onElegir={vi.fn()} />);
    await user.click(screen.getByLabelText("Cliente"));

    const maria = await screen.findByRole("option", { name: /María Gómez/ });

    expect(maria.textContent).toContain("+549110000002");
    expect(maria.textContent).toContain("maria@ejemplo.com");
    expect(screen.getByText(/\+549110000003 · Sin email/)).toBeDefined();
  });

  it("debería avisar el cliente elegido",
  async () =>
  {
    const user = userEvent.setup();
    const onElegir = vi.fn();

    render(<SelectorCliente clientes={CLIENTES} seleccionadoId="" onElegir={onElegir} />);
    await user.click(screen.getByLabelText("Cliente"));
    await user.click(await screen.findByRole("option", { name: /María Gómez/ }));

    expect(onElegir).toHaveBeenCalledWith("cli-maria");
  });

  it("debería permitir limpiar la selección para cargar un cliente nuevo",
  async () =>
  {
    const user = userEvent.setup();
    const onElegir = vi.fn();

    render(<SelectorCliente clientes={CLIENTES} seleccionadoId="cli-maria" onElegir={onElegir} />);

    expect(screen.getByLabelText("Cliente")).toHaveValue("María Gómez");

    await user.click(screen.getByRole("button", { name: "Cargar cliente nuevo" }));

    expect(onElegir).toHaveBeenCalledWith("");
  });
});
