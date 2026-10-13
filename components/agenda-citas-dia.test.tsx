import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgendaCitasDia, { type CitaDia } from "./agenda-citas-dia";

const ZONA = "America/Argentina/Buenos_Aires";

function citaBase(overrides: Record<string, unknown> = {}): CitaDia
{
  return {
    id: "c-1",
    staffId: "staff-1",
    inicio: "2026-10-06T10:00:00-03:00",
    estado: "pendiente",
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
    timeZone: ZONA,
    diaClave: "2026-10-06",
    citas: [citaBase()],
    onCambiarEstado: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("AgendaCitasDia",
() =>
{
  it("debería mostrar solo las citas del día seleccionado en orden por horario",
  () =>
  {
    render(<AgendaCitasDia {...propsBase({
      citas: [
        citaBase({ id: "c-tarde", inicio: "2026-10-06T16:00:00-03:00", cliente: "Tarde" }),
        citaBase({ id: "c-otro-dia", inicio: "2026-10-07T09:00:00-03:00", cliente: "OtroDia" }),
        citaBase({ id: "c-manana", inicio: "2026-10-06T09:00:00-03:00", cliente: "Manana" }),
      ],
    })} />);

    expect(screen.getByText("Citas del día seleccionado")).toBeDefined();

    const tarjetas = screen.getAllByTestId("cita-dia");

    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0]?.textContent).toContain("Manana");
    expect(tarjetas[1]?.textContent).toContain("Tarde");
    expect(screen.queryByText("OtroDia")).toBeNull();
  });

  it("debería avisar cuando el día no tiene citas",
  () =>
  {
    render(<AgendaCitasDia {...propsBase({ citas: [] })} />);

    expect(screen.getByText("Sin citas este día.")).toBeDefined();
  });

  it("debería mostrar el horario con minutos y el profesional",
  () =>
  {
    render(<AgendaCitasDia {...propsBase()} />);

    expect(screen.getByText(/10:00/)).toBeDefined();
    expect(screen.getByText("Diego")).toBeDefined();
  });

  it("debería invocar el cambio de estado al enviar el formulario",
  async () =>
  {
    const user = userEvent.setup();
    const cambiar = vi.fn(async () => {});

    render(<AgendaCitasDia {...propsBase({ onCambiarEstado: cambiar })} />);
    await user.click(screen.getByRole("button", { name: "Marcar seña pagada" }));

    expect(cambiar).toHaveBeenCalledWith("c-1", "pagado");
  });

  it("debería mostrar WhatsApp cuando hay refuerzo disponible",
  () =>
  {
    render(<AgendaCitasDia {...propsBase({
      citas: [citaBase({ estado: "confirmado", whatsappHref: "https://wa.me/5491112345678" })],
    })} />);

    expect(screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href"))
      .toContain("wa.me/5491112345678");
  });
});
