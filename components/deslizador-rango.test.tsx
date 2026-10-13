import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import DeslizadorRango from "./deslizador-rango";

describe("DeslizadorRango",
() =>
{
  it("debería mostrar apertura y cierre como horas",
  () =>
  {
    render(<DeslizadorRango franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={() => undefined} />);

    expect(screen.getByDisplayValue("09:00")).toBeDefined();
    expect(screen.getByDisplayValue("19:00")).toBeDefined();
    expect(screen.getByText("9 a 19")).toBeDefined();
  });

  it("debería avisar el cambio al mover el slider de apertura",
  () =>
  {
    const onChange = vi.fn();
    render(<DeslizadorRango franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Apertura deslizable"), { target: { value: "600" } });

    expect(onChange).toHaveBeenCalledWith({ openMinutes: 600, closeMinutes: 1140 });
  });

  it("debería cambiar la apertura desde el input de hora",
  () =>
  {
    const onChange = vi.fn();
    render(<DeslizadorRango franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Apertura"), { target: { value: "10:00" } });

    expect(onChange).toHaveBeenCalledWith({ openMinutes: 600, closeMinutes: 1140 });
  });

  it("debería cambiar el cierre desde el input de hora",
  () =>
  {
    const onChange = vi.fn();
    render(<DeslizadorRango franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Cierre"), { target: { value: "20:00" } });

    expect(onChange).toHaveBeenCalledWith({ openMinutes: 540, closeMinutes: 1200 });
  });

  it("debería mostrar error cuando el cierre no supera la apertura",
  () =>
  {
    render(<DeslizadorRango franja={{ openMinutes: 1140, closeMinutes: 540 }} onChange={() => undefined} />);

    expect(screen.getByText("El cierre tiene que ser después de la apertura.")).toBeDefined();
  });
});
