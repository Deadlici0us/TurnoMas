import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BookingFlow from "@/components/booking-flow";
import { getDemoBusiness } from "@/lib/portal/demo-business";

describe("BookingFlow",
() =>
{
  it("debería avanzar de profesional a servicio al hacer click",
  async () =>
  {
    const user = userEvent.setup();
    const business = getDemoBusiness("ar", "barberia-diego");

    expect(business).not.toBeNull();

    render(
      <BookingFlow
        negocioNombre={business!.nombre}
        pais={business!.pais}
        slug={business!.slug}
        staff={business!.staff}
        servicios={business!.servicios}
        turnos={business!.turnos}
        bloqueos={business!.bloqueos}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));

    expect(screen.getByRole("heading", { name: "2. Elegí tu servicio" })).toBeDefined();
  });

  it("debería mostrar Sin seña cuando el servicio exige seña 0%",
  async () =>
  {
    const user = userEvent.setup();

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={[{ id: "s1", nombre: "Diego", horarios: { lun: "09:00-12:00" }, activo: true }]}
        servicios={[{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
          precioPromocional: null, senaRequerida: true, senaPorcentaje: 0 }]}
        turnos={[]}
        bloqueos={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.getByText(/Sin seña/)).toBeDefined();
    expect(screen.queryByText(/Seña 0%/)).toBeNull();
  });

  it("debería cerrar el día cuando el negocio está cerrado aunque el profesional abra",
  async () =>
  {
    const user = userEvent.setup();
    const staff = [{ id: "s1", nombre: "Diego",
      horarios: { lun: "09:00-12:00", mar: "09:00-12:00" }, activo: true }];
    const servicios = [{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
      precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }];

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={staff}
        servicios={servicios}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ mié: "09:00-12:00", jue: "09:00-12:00", vie: "09:00-12:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.getByText(/Sin horarios libres los próximos 7 días/)).toBeDefined();
  });

  it("debería mostrar slots cuando el negocio abre más amplio que el profesional",
  async () =>
  {
    const user = userEvent.setup();
    const staff = [{ id: "s1", nombre: "Diego",
      horarios: { lun: "09:00-12:00", mar: "09:00-12:00" }, activo: true }];
    const servicios = [{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
      precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }];

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={staff}
        servicios={servicios}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.queryByText(/Sin horarios libres los próximos 7 días/)).toBeNull();
    expect(screen.getAllByRole("button", { name: "09:00" }).length).toBeGreaterThan(0);
  });
});
