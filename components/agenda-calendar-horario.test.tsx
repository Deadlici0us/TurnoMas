import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgendaCalendar from "./agenda-calendar";
import type { CitaDia } from "./agenda-citas-dia";

const ZONA = "America/Argentina/Buenos_Aires";

function citaBase(overrides: Record<string, unknown> = {}): CitaDia
{
  return {
    id: "c-1",
    staffId: "staff-1",
    inicio: "2026-05-12T10:00:00-03:00",
    estado: "confirmado",
    cliente: "Juan",
    servicio: "Corte",
    profesional: "Diego",
    sena_monto: null,
    sena_porcentaje: null,
    sena_reembolsada: null,
    whatsappHref: null,
    ...overrides,
  } as CitaDia;
}

function propsBase(overrides: Record<string, unknown> = {})
{
  return {
    base: "2026-05-12T12:00:00-03:00",
    timeZone: ZONA,
    staff: [{ id: "staff-1", nombre: "Diego" }],
    turnos: [],
    citas: [],
    onCambiarEstado: async () => {},
    vistaInicial: "dia",
    fechaInicial: "2026-05-12",
    ...overrides,
  };
}

function etiquetasHora(container: HTMLElement): string[]
{
  const todas = Array.from(container.querySelectorAll("span, div"))
    .map((s) => (s.textContent ?? "").trim().slice(0, 5))
    .filter((t) => /^\d{2}:00$/.test(t));

  return [...new Set(todas)];
}

describe("AgendaCalendar rango dinámico por horario del negocio",
() =>
{
  it("debería empezar en la apertura y terminar en el cierre del día",
  () =>
  {
    const { container } = render(<AgendaCalendar {...propsBase({
      horariosNegocio: { mar: ["09:00-19:00"] },
    })} />);
    const etiquetas = etiquetasHora(container);

    expect(etiquetas[0]).toBe("09:00");
    expect(etiquetas[etiquetas.length - 1]).toBe("18:00");
    expect(etiquetas).not.toContain("08:00");
    expect(etiquetas).not.toContain("20:00");
  });

  it("debería cubrir hasta el cierre tardío del negocio",
  () =>
  {
    const { container } = render(<AgendaCalendar {...propsBase({
      horariosNegocio: { mar: ["08:00-22:00"] },
    })} />);
    const etiquetas = etiquetasHora(container);

    expect(etiquetas).toContain("21:00");
    expect(etiquetas).not.toContain("07:00");
  });

  it("debería mostrar rango mínimo 4h y aviso cuando está cerrado",
  () =>
  {
    const { container } = render(<AgendaCalendar {...propsBase({
      horariosNegocio: { mar: [] },
      fechaInicial: "2026-05-12",
    })} />);
    const etiquetas = etiquetasHora(container);

    expect(etiquetas).toEqual(["08:00", "09:00", "10:00", "11:00"]);
    expect(screen.getByText(/cerrado/i)).toBeDefined();
  });

  it("debería expandir el rango si hay un turno fuera del horario",
  () =>
  {
    const { container } = render(<AgendaCalendar {...propsBase({
      horariosNegocio: { mar: ["09:00-19:00"] },
      turnos: [{
        id: "t-tarde",
        staffId: "staff-1",
        inicio: "2026-05-12T21:00:00-03:00",
        fin: "2026-05-12T21:30:00-03:00",
        estado: "confirmado",
        titulo: "Tarde · Corte",
        profesional: "Diego",
      }],
      citas: [citaBase({ id: "c-tarde", inicio: "2026-05-12T21:00:00-03:00" })],
    })} />);
    const etiquetas = etiquetasHora(container);

    expect(etiquetas[0]).toBe("09:00");
    expect(etiquetas).toContain("21:00");
  });

  it("debería usar el min-max de la semana en vista semana",
  async () =>
  {
    const user = userEvent.setup();
    const { container } = render(<AgendaCalendar {...propsBase({
      horariosNegocio: { lun: ["08:00-22:00"], mar: ["09:00-19:00"] },
      vistaInicial: "semana",
      fechaInicial: "2026-05-12",
    })} />);

    await user.click(screen.getByRole("button", { name: "Semana" }));
    const etiquetas = etiquetasHora(container);

    expect(etiquetas).toContain("08:00");
    expect(etiquetas).toContain("21:00");
  });
});
