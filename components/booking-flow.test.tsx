import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BookingFlow from "@/components/booking-flow";
import { getDemoBusiness } from "@/lib/portal/demo-business";
import { dayKeyForWeekday } from "@/lib/staff/schedule";

describe("BookingFlow",
() =>
{
  it("debería avanzar de profesional a servicio al hacer click",
  async () =>
  {
    const user = userEvent.setup();
    const business = getDemoBusiness("ar", "negocio-demo");

    expect(business).not.toBeNull();

    render(
      <BookingFlow
        negocioNombre={business!.nombre}
        pais={business!.pais}
        slug={business!.slug}
        staff={business!.staff}
        servicios={business!.servicios}
        asociaciones={business!.asociaciones}
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
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
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
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ mié: "09:00-12:00", jue: "09:00-12:00", vie: "09:00-12:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.getByText(/Sin horarios libres los próximos 7 días/)).toBeDefined();
  });

  it("debería mostrar días simples y pedir elegir día antes que hora",
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
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.queryByText(/Sin horarios libres los próximos 7 días/)).toBeNull();
    expect(screen.getByText(/Elegí el día/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "09:00" })).toBeNull();
  });

  it("debería mostrar solo las horas del día elegido en grande",
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
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));
    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);

    expect(screen.getByText(/Elegí la hora/)).toBeDefined();
    expect(screen.getAllByRole("button", { name: "09:00" }).length).toBeGreaterThan(0);
  });

  it("debería pedir revisión del email inválido en el paso de datos",
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
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));
    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);
    await user.click(screen.getAllByRole("button", { name: "09:00" })[0]!);

    await user.type(screen.getByPlaceholderText("Ej: Juan Pérez"), "Juan");
    await user.type(screen.getByPlaceholderText("Ej: +549110000001"), "+549110000001");
    await user.type(screen.getByPlaceholderText("Ej: juan@ejemplo.com"), "no-es-email");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));

    expect(screen.getByText(/Revisá tu email/)).toBeDefined();
  });

  it("debería mostrar la confirmación animada al crear la reserva",
  async () =>
  {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={[{ id: "s1", nombre: "Diego",
          horarios: { lun: "09:00-12:00", mar: "09:00-12:00" }, activo: true }]}
        servicios={[{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
          precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }]}
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));
    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);
    await user.click(screen.getAllByRole("button", { name: "09:00" })[0]!);

    await user.type(screen.getByPlaceholderText("Ej: Juan Pérez"), "Juan");
    await user.type(screen.getByPlaceholderText("Ej: +549110000001"), "+549110000001");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));

    expect(await screen.findByTestId("reserva-confirmada")).toBeDefined();
    expect(screen.getByText("¡Reserva confirmada!")).toBeDefined();
    expect(fetchMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("debería confirmar por email y no afirmar un envío por WhatsApp",
  async () =>
  {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ emailEnviado: true }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={[{ id: "s1", nombre: "Diego",
          horarios: { lun: "09:00-12:00", mar: "09:00-12:00" }, activo: true }]}
        servicios={[{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
          precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }]}
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));
    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);
    await user.click(screen.getAllByRole("button", { name: "09:00" })[0]!);

    await user.type(screen.getByPlaceholderText("Ej: Juan Pérez"), "Juan");
    await user.type(screen.getByPlaceholderText("Ej: +549110000001"), "+549110000001");
    await user.type(screen.getByPlaceholderText("Ej: juan@ejemplo.com"), "juan@ejemplo.com");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));

    expect(await screen.findByTestId("reserva-confirmada")).toBeDefined();
    expect(screen.getByText(/Te enviamos la confirmación a juan@ejemplo.com/)).toBeDefined();
    expect(screen.queryByText(/Te escribimos al/)).toBeNull();
    vi.unstubAllGlobals();
  });

  it("debería avisar cuando el email de confirmación no se pudo enviar",
  async () =>
  {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ emailEnviado: false }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={[{ id: "s1", nombre: "Diego",
          horarios: { lun: "09:00-12:00", mar: "09:00-12:00" }, activo: true }]}
        servicios={[{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
          precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }]}
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));
    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);
    await user.click(screen.getAllByRole("button", { name: "09:00" })[0]!);

    await user.type(screen.getByPlaceholderText("Ej: Juan Pérez"), "Juan");
    await user.type(screen.getByPlaceholderText("Ej: +549110000001"), "+549110000001");
    await user.type(screen.getByPlaceholderText("Ej: juan@ejemplo.com"), "juan@ejemplo.com");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));

    expect(await screen.findByTestId("reserva-confirmada")).toBeDefined();
    expect(screen.getByText(/no pudimos enviar el email/i)).toBeDefined();
    vi.unstubAllGlobals();
  });

  it("debería simular la reserva demo sin llamar al backend",
  async () =>
  {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BookingFlow
        negocioNombre="Negocio Demo"
        pais="ar"
        slug="negocio-demo"
        demo={true}
        staff={[{ id: "s1", nombre: "Diego",
          horarios: { lun: "09:00-12:00", mar: "09:00-12:00" }, activo: true }]}
        servicios={[{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
          precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }]}
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
        horariosNegocio={{ lun: "08:00-22:00", mar: "08:00-22:00", mié: "08:00-22:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));
    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);
    await user.click(screen.getAllByRole("button", { name: "09:00" })[0]!);

    await user.type(screen.getByPlaceholderText("Ej: Juan Pérez"), "Juan");
    await user.type(screen.getByPlaceholderText("Ej: +549110000001"), "+549110000001");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));

    expect(await screen.findByTestId("reserva-confirmada")).toBeDefined();
    expect(screen.getByText(/no se guardó en la base de datos/)).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("debería mostrar solo los servicios que brinda el profesional",
  async () =>
  {
    const user = userEvent.setup();

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={[{ id: "s1", nombre: "Diego", horarios: { lun: "09:00-12:00" }, activo: true }]}
        servicios={[
          { id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
            precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 },
          { id: "sv2", nombre: "Barba", duracionMin: 20, precioBase: 800000,
            precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 },
        ]}
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[]}
        bloqueos={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));

    expect(screen.getByRole("button", { name: /Corte/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Barba/ })).toBeNull();
  });

  it("no debería ofrecer un horario dentro de un turno de 45 minutos",
  async () =>
  {
    const user = userEvent.setup();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    const claveDia = dayKeyForWeekday(manana.getDay());
    const inicioTurno = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate(), 9, 0, 0, 0);
    const finTurno = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate(), 9, 45, 0, 0);

    render(
      <BookingFlow
        negocioNombre="Barbería Diego"
        pais="ar"
        slug="barberia-diego"
        staff={[{ id: "s1", nombre: "Gisela", horarios: { [claveDia]: "09:00-11:00" }, activo: true }]}
        servicios={[{ id: "sv1", nombre: "Corte", duracionMin: 30, precioBase: 1500000,
          precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }]}
        asociaciones={[{ staffId: "s1", servicioId: "sv1" }]}
        turnos={[{
          staffId: "s1",
          servicioId: "sv1",
          inicio: inicioTurno.toISOString(),
          fin: finTurno.toISOString(),
        }]}
        bloqueos={[]}
        horariosNegocio={{ [claveDia]: "09:00-11:00" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Gisela" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));
    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);

    expect(screen.queryByRole("button", { name: "09:30" })).toBeNull();
    expect(screen.getByRole("button", { name: "10:00" })).toBeDefined();
  });

  it("debería avisar cuando el profesional no tiene servicios asignados",
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
          precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 }]}
        asociaciones={[]}
        turnos={[]}
        bloqueos={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));

    expect(screen.getByText(/todavía no tiene servicios asignados/)).toBeDefined();
  });
});
