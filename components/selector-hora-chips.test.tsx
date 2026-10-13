import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SelectorHoraChips from "./selector-hora-chips";

describe("SelectorHoraChips",
() =>
{
  it("debería mostrar las 48 medias horas con la elegida marcada",
  () =>
  {
    render(<SelectorHoraChips etiqueta="Abrís" valor={540} onChange={() => undefined} />);

    expect(screen.getByText("Abrís")).toBeDefined();
    expect(screen.getAllByRole("button")).toHaveLength(48);
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "09:30" })).toHaveAttribute("aria-pressed", "false");
  });

  it("debería avisar la hora elegida",
  async () =>
  {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectorHoraChips etiqueta="Cerrás" valor={540} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "19:00" }));

    expect(onChange).toHaveBeenCalledWith(1140);
  });

  it("debería deshabilitar horas fuera del rango válido",
  () =>
  {
    render(<SelectorHoraChips etiqueta="Cerrás" valor={1140} min={570} onChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "09:00" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "09:30" })).not.toBeDisabled();
  });

  it("debería respetar el tope máximo",
  () =>
  {
    render(<SelectorHoraChips etiqueta="Abrís" valor={540} max={780} onChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "13:00" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "13:30" })).toBeDisabled();
  });

  it("debería avisar valor personalizado fuera de grilla",
  () =>
  {
    render(<SelectorHoraChips etiqueta="Abrís" valor={555} onChange={() => undefined} />);

    expect(screen.getByText(/Horario personalizado/)).toBeDefined();
  });
});
