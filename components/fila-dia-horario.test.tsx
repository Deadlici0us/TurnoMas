import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FilaDiaHorario from "./fila-dia-horario";

/** Expande el día colapsado para ver los pasos. */
async function expandir(nombre: RegExp): Promise<void>
{
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: nombre }));
}

describe("FilaDiaHorario",
() =>
{
  it("debería mostrar el día colapsado con el resumen",
  () =>
  {
    render(<FilaDiaHorario dia="lun" franjas={[{ openMinutes: 540, closeMinutes: 1140 }]} onChange={() => undefined} />);

    expect(screen.getByText("Lunes")).toBeDefined();
    expect(screen.getByText("9 a 19")).toBeDefined();
    expect(screen.getByRole("switch", { name: /Lunes/ })).toBeChecked();
    expect(screen.queryByText("¿Cómo trabajás?")).toBeNull();
  });

  it("debería expandir al tocar la fila",
  async () =>
  {
    render(<FilaDiaHorario dia="lun" franjas={[{ openMinutes: 540, closeMinutes: 1140 }]} onChange={() => undefined} />);

    await expandir(/Lunes.*9 a 19/);

    expect(screen.getByText("¿Cómo trabajás?")).toBeDefined();
    expect(screen.getByText("Abrís")).toBeDefined();
    expect(screen.getByText("Cerrás")).toBeDefined();
  });

  it("debería mostrar cerrado con switch apagado",
  () =>
  {
    render(<FilaDiaHorario dia="dom" franjas={[]} onChange={() => undefined} />);

    expect(screen.getByText("Cerrado")).toBeDefined();
    expect(screen.queryByText("¿Cómo trabajás?")).toBeNull();
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

  it("debería pasar a cortado agregando el segundo turno",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[{ openMinutes: 540, closeMinutes: 1140 }]}
      onChange={onChange}
    />);

    await expandir(/Lunes/);
    await user.click(screen.getByRole("button", { name: /Cortado/ }));

    expect(onChange).toHaveBeenCalledWith([
      { openMinutes: 540, closeMinutes: 1140 },
      { openMinutes: 900, closeMinutes: 1200 },
    ]);
  });

  it("debería volver a corrido conservando el primer turno",
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

    await expandir(/Lunes/);
    await user.click(screen.getByRole("button", { name: /Corrido/ }));

    expect(onChange).toHaveBeenCalledWith([{ openMinutes: 540, closeMinutes: 780 }]);
  });

  it("debería cambiar la apertura con el reloj nativo",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[{ openMinutes: 540, closeMinutes: 1140 }]}
      onChange={onChange}
    />);

    await expandir(/Lunes/);

    const input = screen.getByLabelText("Abrís");

    fireEvent.change(input, { target: { value: "10:00" } });
    void user;

    expect(onChange).toHaveBeenCalledWith([{ openMinutes: 600, closeMinutes: 1140 }]);
  });

  it("debería cambiar el cierre con el reloj nativo",
  async () =>
  {
    const onChange = vi.fn();
    render(<FilaDiaHorario
      dia="lun"
      franjas={[{ openMinutes: 540, closeMinutes: 1140 }]}
      onChange={onChange}
    />);

    await expandir(/Lunes/);

    fireEvent.change(screen.getByLabelText("Cerrás"), { target: { value: "20:00" } });

    expect(onChange).toHaveBeenCalledWith([{ openMinutes: 540, closeMinutes: 1200 }]);
  });

  it("debería mostrar error de superposición sin botón de agregar",
  async () =>
  {
    render(<FilaDiaHorario
      dia="lun"
      franjas={[
        { openMinutes: 540, closeMinutes: 780 },
        { openMinutes: 700, closeMinutes: 1200 },
      ]}
      onChange={() => undefined}
    />);

    await expandir(/Lunes/);

    expect(screen.getByText("Esos turnos se superponen. Separalos o unilos en uno solo.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Agregar/ })).toBeNull();
  });
});
