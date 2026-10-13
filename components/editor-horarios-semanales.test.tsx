import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EditorHorariosSemanales from "./editor-horarios-semanales";

describe("EditorHorariosSemanales",
() =>
{
  it("debería mostrar los 7 días con el resumen de la semana",
  () =>
  {
    render(<EditorHorariosSemanales
      inicial={{ lun: "09:00-19:00", mar: "09:00-19:00" }}
      action={async () => undefined}
    />);

    for (const dia of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"])
    {
      expect(screen.getByText(dia)).toBeDefined();
    }

    expect(screen.getByText(/Lun.*9 a 19/)).toBeDefined();
  });

  it("debería serializar a hidden inputs compatibles con la Server Action",
  () =>
  {
    render(<EditorHorariosSemanales
      inicial={{ lun: ["09:00-13:00", "15:00-20:00"] }}
      action={async () => undefined}
    />);

    expect((document.querySelector('input[type="hidden"][name="lun"]') as HTMLInputElement).value)
      .toBe("09:00-13:00, 15:00-20:00");
    expect((document.querySelector('input[type="hidden"][name="dom"]') as HTMLInputElement).value).toBe("");
  });

  it("debería aplicar el preset corrido a toda la semana",
  async () =>
  {
    const user = userEvent.setup();
    render(<EditorHorariosSemanales inicial={{}} action={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: /Corrido 9 a 19/ }));

    expect((document.querySelector('input[type="hidden"][name="lun"]') as HTMLInputElement).value)
      .toBe("09:00-19:00");
    expect((document.querySelector('input[type="hidden"][name="sáb"]') as HTMLInputElement).value)
      .toBe("09:00-19:00");
  });

  it("debería copiar el lunes al resto de la semana",
  async () =>
  {
    const user = userEvent.setup();
    render(<EditorHorariosSemanales
      inicial={{ lun: "10:00-20:00" }}
      action={async () => undefined}
    />);

    await user.click(screen.getByRole("button", { name: /Copiar lunes/ }));

    expect((document.querySelector('input[type="hidden"][name="mar"]') as HTMLInputElement).value)
      .toBe("10:00-20:00");
    expect((document.querySelector('input[type="hidden"][name="vie"]') as HTMLInputElement).value)
      .toBe("10:00-20:00");
    expect((document.querySelector('input[type="hidden"][name="lun"]') as HTMLInputElement).value)
      .toBe("10:00-20:00");
  });

  it("debería enviar los horarios a la Server Action al guardar",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async () => undefined);
    render(<EditorHorariosSemanales inicial={{ lun: "09:00-19:00" }} action={action} />);

    await user.click(screen.getByRole("button", { name: "Guardar horarios" }));

    expect(action).toHaveBeenCalledOnce();
    const formData = (action.mock.calls[0] as unknown as [FormData])[0];

    expect(formData.get("lun")).toBe("09:00-19:00");
    expect(formData.get("dom")).toBe("");
  });

  it("debería mostrar error y no enviar con franjas superpuestas",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async () => undefined);
    render(<EditorHorariosSemanales
      inicial={{ lun: ["09:00-13:00", "15:00-20:00"] }}
      action={action}
    />);

    await user.click(screen.getByRole("button", { name: /Lunes.*13/ }));

    const cerras = screen.getAllByLabelText("Cerrás");

    fireEvent.change(cerras[0]!, { target: { value: "16:00" } });

    await user.click(screen.getByRole("button", { name: "Guardar horarios" }));

    expect(await screen.findByText(/Revisá los días marcados/)).toBeDefined();
    expect(action).not.toHaveBeenCalled();
  });

  it("debería cambiar la apertura con el reloj nativo",
  async () =>
  {
    const user = userEvent.setup();
    render(<EditorHorariosSemanales
      inicial={{ lun: "09:00-19:00" }}
      action={async () => undefined}
    />);

    await user.click(screen.getByRole("button", { name: /Lunes.*9 a 19/ }));

    fireEvent.change(screen.getAllByLabelText("Abrís")[0]!, { target: { value: "10:00" } });

    expect((document.querySelector('input[type="hidden"][name="lun"]') as HTMLInputElement).value)
      .toBe("10:00-19:00");
  });

  it("debería renderizar solo campos embebidos sin form propio",
  () =>
  {
    render(<EditorHorariosSemanales inicial={{ lun: "09:00-19:00" }} />);

    expect(screen.queryByRole("button", { name: "Guardar horarios" })).toBeNull();
    expect((document.querySelector('input[type="hidden"][name="lun"]') as HTMLInputElement).value)
      .toBe("09:00-19:00");
  });
});
