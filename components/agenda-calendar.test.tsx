import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgendaCalendar from "./agenda-calendar";

const ZONA = "America/Argentina/Buenos_Aires";
const HOY = "2026-05-12T12:00:00-03:00";

const STAFF = [
  { id: "staff-1", nombre: "Diego" },
  { id: "staff-2", nombre: "Camila" },
];

function turnoBase(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    staffId: "staff-1",
    inicio: "2026-05-12T10:00:00-03:00",
    fin: "2026-05-12T10:30:00-03:00",
    estado: "confirmado",
    titulo: "Juan · Corte",
    ...overrides,
  };
}

function propsBase(overrides: Record<string, unknown> = {})
{
  return {
    base: HOY,
    timeZone: ZONA,
    staff: STAFF,
    turnos: [turnoBase()],
    externos: [{ id: "e-1", titulo: "Dentista", inicio: "2026-05-12T16:00:00-03:00", fin: "2026-05-12T17:00:00-03:00" }],
    vistaInicial: "dia",
    fechaInicial: "2026-05-12",
    ...overrides,
  };
}

describe("AgendaCalendar",
() =>
{
  it("debería mostrar el día en curso por defecto con sus turnos",
  () =>
  {
    render(<AgendaCalendar {...propsBase()} />);

    expect(screen.getByText("Calendario")).toBeDefined();
    expect(screen.getByTitle("Juan · Corte")).toBeDefined();
    expect(screen.getByTitle("Google · Dentista")).toBeDefined();
  });

  it("debería cambiar entre día, semana y mes",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaCalendar {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "Semana" }));

    expect(screen.getByTitle("Juan · Corte")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Mes" }));

    expect(screen.getByText("12")).toBeDefined();
  });

  it("debería navegar al día siguiente y volver a hoy",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaCalendar {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "Día siguiente" }));

    expect(screen.queryByTitle("Juan · Corte")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Hoy" }));

    expect(screen.getByTitle("Juan · Corte")).toBeDefined();
  });

  it("debería filtrar por profesional",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaCalendar {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "Camila" }));

    expect(screen.queryByTitle("Juan · Corte")).toBeNull();
  });

  it("debería mostrar la zona horaria y la leyenda",
  () =>
  {
    render(<AgendaCalendar {...propsBase()} />);

    expect(screen.getByText(new RegExp(ZONA.replace(/\//g, "\\/")))).toBeDefined();
    expect(screen.getByLabelText("Significado de los colores")).toBeDefined();
  });
});
