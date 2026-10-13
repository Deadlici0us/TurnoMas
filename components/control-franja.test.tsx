import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ControlFranja from "./control-franja";

describe("ControlFranja",
() =>
{
  it("debería mostrar las horas en grande con la duración",
  () =>
  {
    render(<ControlFranja franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={() => undefined} />);

    expect(screen.getByDisplayValue("09:00")).toBeDefined();
    expect(screen.getByDisplayValue("19:00")).toBeDefined();
    expect(screen.getByText("9 a 19 · 10 h")).toBeDefined();
  });

  it("debería adelantar la apertura de a 30 minutos",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlFranja franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Adelantar apertura" }));

    expect(onChange).toHaveBeenCalledWith({ openMinutes: 570, closeMinutes: 1140 });
  });

  it("debería atrasar el cierre de a 30 minutos",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlFranja franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Atrasar cierre" }));

    expect(onChange).toHaveBeenCalledWith({ openMinutes: 540, closeMinutes: 1110 });
  });

  it("debería frenar la apertura antes del cierre",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlFranja franja={{ openMinutes: 540, closeMinutes: 600 }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Adelantar apertura" }));
    await user.click(screen.getByRole("button", { name: "Adelantar apertura" }));

    expect(onChange).toHaveBeenLastCalledWith({ openMinutes: 570, closeMinutes: 600 });
  });

  it("debería frenar en los bordes del día",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlFranja franja={{ openMinutes: 0, closeMinutes: 60 }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Atrasar apertura" }));

    expect(onChange).toHaveBeenCalledWith({ openMinutes: 0, closeMinutes: 60 });
  });

  it("debería cambiar la hora exacta desde el input",
  () =>
  {
    const onChange = vi.fn();
    render(<ControlFranja franja={{ openMinutes: 540, closeMinutes: 1140 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Apertura"), { target: { value: "10:00" } });

    expect(onChange).toHaveBeenCalledWith({ openMinutes: 600, closeMinutes: 1140 });
  });

  it("debería mostrar error cuando el cierre no supera la apertura",
  () =>
  {
    render(<ControlFranja franja={{ openMinutes: 1140, closeMinutes: 540 }} onChange={() => undefined} />);

    expect(screen.getByText("El cierre tiene que ser después de la apertura.")).toBeDefined();
  });
});
