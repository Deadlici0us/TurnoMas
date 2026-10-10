import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StaffDeleteForm from "./staff-delete-form";

describe("StaffDeleteForm",
() =>
{
  it("debería llamar a la acción cuando se confirma",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async () => undefined);
    window.confirm = vi.fn(() => true);

    render(<StaffDeleteForm action={action} />);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "¿Eliminar a este profesional? Solo se puede si no tiene turnos.");
    expect(action).toHaveBeenCalledOnce();
  });

  it("debería frenar el envío cuando se cancela",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async () => undefined);
    window.confirm = vi.fn(() => false);

    render(<StaffDeleteForm action={action} />);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(action).not.toHaveBeenCalled();
  });
});
