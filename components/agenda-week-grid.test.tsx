import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgendaWeekGrid from "./agenda-week-grid";

const TIMEZONE = "America/Argentina/Buenos_Aires";
const BASE = "2026-10-05T12:00:00-03:00";

const STAFF = [
  { id: "staff-1", nombre: "Diego" },
  { id: "staff-2", nombre: "María" },
];

function turnoBase(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    staffId: "staff-1",
    inicio: "2026-10-05T10:00:00-03:00",
    fin: "2026-10-05T10:30:00-03:00",
    estado: "confirmado",
    titulo: "Corte · Juan",
    ...overrides,
  };
}

function propsBase(overrides: Record<string, unknown> = {})
{
  return {
    base: BASE,
    timeZone: TIMEZONE,
    staff: STAFF,
    turnos: [turnoBase()],
    externos: [{ id: "e-1", titulo: "Dentista", inicio: "2026-10-05T16:00:00-03:00", fin: "2026-10-05T17:00:00-03:00" }],
    ...overrides,
  };
}

describe("AgendaWeekGrid",
() =>
{
  it("debería mostrar semana, rango y zona horaria",
  () =>
  {
    render(<AgendaWeekGrid {...propsBase()} />);

    expect(screen.getByRole("heading", { name: "Semana" })).toBeDefined();
    expect(screen.getByText(new RegExp(TIMEZONE.replace(/\//g, "\\/")))).toBeDefined();
  });

  it("debería mostrar turnos y eventos externos",
  () =>
  {
    render(<AgendaWeekGrid {...propsBase()} />);

    expect(screen.getByTitle("Corte · Juan")).toBeDefined();
    expect(screen.getByTitle("Google · Dentista")).toBeDefined();
  });

  it("debería filtrar por profesional",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaWeekGrid {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "María" }));

    expect(screen.queryByTitle("Corte · Juan")).toBeNull();
  });

  it("debería volver a mostrar todos",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaWeekGrid {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "María" }));
    await user.click(screen.getByRole("button", { name: "Todos" }));

    expect(screen.getByTitle("Corte · Juan")).toBeDefined();
  });

  it("debería preseleccionar con un solo profesional",
  () =>
  {
    render(<AgendaWeekGrid {...propsBase({ staff: [STAFF[0]] })} />);

    expect(screen.getByRole("button", { name: "Diego" })).toBeDefined();
  });

  it("debería navegar semanas y volver a hoy",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaWeekGrid {...propsBase()} />);
    const hoy = screen.getByRole("button", { name: "Hoy" });

    expect(hoy).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));

    expect(screen.getByRole("button", { name: "Hoy" })).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Hoy" }));

    expect(screen.getByRole("button", { name: "Hoy" })).toBeDisabled();
  });

  it("debería tolerar base y turnos inválidos",
  () =>
  {
    render(<AgendaWeekGrid {...propsBase({
      base: "no-fecha",
      turnos: [turnoBase({ inicio: "mal", fin: "peor" }), turnoBase({ id: "t-2", fin: "2026-10-05T09:00:00-03:00" })],
      externos: [],
    })} />);

    expect(screen.getByRole("heading", { name: "Semana" })).toBeDefined();
    expect(screen.queryByTitle("Corte · Juan")).toBeNull();
  });
});
