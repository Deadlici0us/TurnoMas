import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SelectorHoraChips from "./selector-hora-chips";

describe("SelectorHoraChips",
() =>
{
  it("debería mostrar un reloj nativo simple con la hora elegida",
  () =>
  {
    render(<SelectorHoraChips etiqueta="Abrís" valor={540} onChange={() => undefined} />);

    const input = screen.getByLabelText("Abrís");

    expect(input).toHaveAttribute("type", "time");
    expect(input).toHaveValue("09:00");
  });

  it("debería avisar la hora elegida con el reloj del sistema",
  () =>
  {
    const onChange = vi.fn();
    render(<SelectorHoraChips etiqueta="Cerrás" valor={540} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Cerrás"), { target: { value: "19:00" } });

    expect(onChange).toHaveBeenLastCalledWith(1140);
  });

  it("debería avisar aunque el valor salga del rango sugerido",
  () =>
  {
    const onChange = vi.fn();
    render(<SelectorHoraChips etiqueta="Cerrás" valor={1140} onChange={onChange} />);

    const input = screen.getByLabelText("Cerrás");

    expect(input).toHaveAttribute("type", "time");
    expect(input).not.toHaveAttribute("min");
    expect(input).not.toHaveAttribute("max");

    fireEvent.change(input, { target: { value: "09:00" } });

    expect(onChange).toHaveBeenCalledWith(540);
  });

  it("debería mostrar valores personalizados legacy sin romper",
  () =>
  {
    render(<SelectorHoraChips etiqueta="Abrís" valor={555} onChange={() => undefined} />);

    expect(screen.getByLabelText("Abrís")).toHaveValue("09:15");
  });

  it("debería ignorar texto vacío sin avisar",
  () =>
  {
    const onChange = vi.fn();
    render(<SelectorHoraChips etiqueta="Abrís" valor={540} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Abrís"), { target: { value: "" } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
