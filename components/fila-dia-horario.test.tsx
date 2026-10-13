import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FilaDiaHorario from "./fila-dia-horario";

describe("FilaDiaHorario",
() =>
{
  it("debería mostrar el día, el resumen y el switch prendido",
  () =>
  {
    render(<FilaDiaHorario dia="lun" franjas={[{ openMinutes: 540, closeMinutes: 1140 }]} onChange={() => undefined} />);

    expect(screen.getByText("Lunes")).toBeDefined();
    expect(screen.getByText("9 a 19")).toBeDefined();
    expect(screen.getByRole("switch", { name: /Lunes/ })).toBeChecked();
  });

  it("debería mostrar cerrado con switch apagado y sin controles",
  () =>
  {
    render(<FilaDiaHorario dia="dom" franjas={[]} onChange={() => undefined} />);

    expect(screen.getByText("Cerrado")).toBeDefined();
    expect(screen.queryByLabelText("Apertura")).toBeNull();
  });

  it("debería cerrar el día al apagar el switch",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[{ openMinutes: 540, closeMinutes: 1140 }]}
      onChange={onChange}
    />);

    await user.click(screen.getByRole("switch", { name: /Lunes/ }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("debería abrir con jornada corrida al prender el switch",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilaDiaHorario dia="dom" franjas={[]} onChange={onChange} />);

    await user.click(screen.getByRole("switch", { name: /Domingo/ }));

    expect(onChange).toHaveBeenCalledWith([{ openMinutes: 540, closeMinutes: 1140 }]);
  });

  it("debería agregar una segunda franja para el descanso",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[{ openMinutes: 540, closeMinutes: 1140 }]}
      onChange={onChange}
    />);

    await user.click(screen.getByRole("button", { name: /Agregar segundo turno/ }));

    expect(onChange).toHaveBeenCalledWith([
      { openMinutes: 540, closeMinutes: 1140 },
      { openMinutes: 900, closeMinutes: 1200 },
    ]);
  });

  it("debería quitar una franja",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[
        { openMinutes: 540, closeMinutes: 780 },
        { openMinutes: 900, closeMinutes: 1200 },
      ]}
      onChange={onChange}
    />);

    await user.click(screen.getAllByRole("button", { name: /Quitar turno/ })[0]);

    expect(onChange).toHaveBeenCalledWith([{ openMinutes: 900, closeMinutes: 1200 }]);
  });

  it("debería mostrar error de superposición",
  () =>
  {
    render(<FilaDiaHorario
      dia="lun"
      franjas={[
        { openMinutes: 540, closeMinutes: 780 },
        { openMinutes: 700, closeMinutes: 1200 },
      ]}
      onChange={() => undefined}
    />);

    expect(screen.getByText("Esos turnos se superponen. Separalos o unilos en uno solo.")).toBeDefined();
  });

  it("debería actualizar una franja desde los steppers",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[{ openMinutes: 540, closeMinutes: 1140 }]}
      onChange={onChange}
    />);

    await user.click(screen.getByRole("button", { name: "Adelantar apertura" }));

    expect(onChange).toHaveBeenCalledWith([{ openMinutes: 570, closeMinutes: 1140 }]);
  });

  it("debería actualizar una franja desde el input de hora",
  () =>
  {
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[{ openMinutes: 540, closeMinutes: 1140 }]}
      onChange={onChange}
    />);

    fireEvent.change(screen.getByLabelText("Apertura"), { target: { value: "10:00" } });

    expect(onChange).toHaveBeenCalledWith([{ openMinutes: 600, closeMinutes: 1140 }]);
  });
});
