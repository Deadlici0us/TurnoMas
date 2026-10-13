import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgendaCalendar from "./agenda-calendar";
import type { CitaDia } from "./agenda-citas-dia";

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
    sena_monto: 5000,
    sena_porcentaje: 50,
    sena_reembolsada: null,
    whatsappHref: null,
    ...overrides,
  } as CitaDia;
}

function propsBase(overrides: Record<string, unknown> = {})
{
  return {
    base: HOY,
    timeZone: ZONA,
    staff: STAFF,
    turnos: [turnoBase()],
    externos: [{ id: "e-1", titulo: "Dentista", inicio: "2026-05-12T16:00:00-03:00", fin: "2026-05-12T17:00:00-03:00" }],
    citas: [citaBase()],
    onCambiarEstado: async () => {},
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

  it("debería titular el mes con el mes base aunque la grilla arranque antes",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaCalendar {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "Mes" }));

    expect(screen.getByText(/may 2026/)).toBeDefined();
  });

  it("debería mostrar las citas del día seleccionado en orden por horario",
  () =>
  {
    render(<AgendaCalendar {...propsBase({
      citas: [
        citaBase({ id: "c-tarde", inicio: "2026-05-12T16:00:00-03:00", cliente: "Tarde" }),
        citaBase({ id: "c-manana", inicio: "2026-05-12T09:00:00-03:00", cliente: "Manana" }),
        citaBase({ id: "c-otro", inicio: "2026-05-13T09:00:00-03:00", cliente: "OtroDia" }),
      ],
    })} />);

    const tarjetas = screen.getAllByTestId("cita-dia");

    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0]?.textContent).toContain("Manana");
    expect(tarjetas[1]?.textContent).toContain("Tarde");
  });

  it("debería actualizar las citas al navegar de día",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaCalendar {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "Día siguiente" }));

    expect(screen.getByText("Sin citas este día.")).toBeDefined();
    expect(screen.queryByTestId("cita-dia")).toBeNull();
  });

  it("debería filtrar las citas del día por profesional",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaCalendar {...propsBase({
      citas: [
        citaBase({ id: "c-1", staffId: "staff-1", cliente: "Juan" }),
        citaBase({ id: "c-2", staffId: "staff-2", cliente: "Camila Cli", profesional: "Camila" }),
      ],
    })} />);
    await user.click(screen.getByRole("button", { name: "Camila" }));

    const tarjetas = screen.getAllByTestId("cita-dia");

    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0]?.textContent).toContain("Camila Cli");
  });

  it("debería exponer la semana como región scrolleable con etiqueta",
  async () =>
  {
    const user = userEvent.setup();

    render(<AgendaCalendar {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "Semana" }));

    const region = screen.getByRole("region", { name: /semana/i });

    expect(region.getAttribute("tabindex")).toBe("0");
  });

  it("debería marcar la columna de hoy en la vista semana",
  async () =>
  {
    const user = userEvent.setup();
    const { container } = render(<AgendaCalendar {...propsBase()} />);
    await user.click(screen.getByRole("button", { name: "Semana" }));

    expect(container.querySelector('[data-hoy="true"]')).not.toBeNull();
  });

  function etiquetasHora(container: HTMLElement): HTMLElement[]
  {
    return Array.from(container.querySelectorAll("span")).filter((s) =>
      /^\d{2}:00$/.test((s.textContent ?? "").trim())) as HTMLElement[];
  }

  it("debería pintar las etiquetas de hora del día sobre los bloques",
  () =>
  {
    const { container } = render(<AgendaCalendar {...propsBase()} />);
    const etiquetas = etiquetasHora(container);

    expect(etiquetas.length).toBeGreaterThan(0);

    for (const e of etiquetas)
    {
      expect(e.className).toContain("z-10");
    }
  });

  it("debería ubicar la primera etiqueta del día debajo de su línea",
  () =>
  {
    const { container } = render(<AgendaCalendar {...propsBase()} />);
    const etiquetas = etiquetasHora(container);
    const primera = etiquetas[0] as HTMLElement;

    expect(primera.className).not.toContain("-top-2");
  });
});
