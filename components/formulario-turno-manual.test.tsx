import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import FormularioTurnoManual from "./formulario-turno-manual";

vi.mock("react", async (importOriginal) =>
{
  const mod = await importOriginal<typeof import("react")>();

  return {
    ...mod,
    useActionState: (action: (prev: string | null, formData: FormData) => Promise<string | null>) =>
    {
      const [state, setState] = useState<string | null>(null);

      const dispatch = (formData: FormData): void =>
      {
        void action(state, formData).then(setState);
      };

      return [state, dispatch, false];
    },
  };
});

const HORARIOS = {
  lun: "08:00-22:00",
  mar: "08:00-22:00",
  mié: "08:00-22:00",
  jue: "08:00-22:00",
  vie: "08:00-22:00",
  sáb: "08:00-22:00",
  dom: "08:00-22:00",
};

const STAFF = [
  { id: "staff-1", nombre: "Diego", horarios: HORARIOS, activo: true },
  { id: "staff-2", nombre: "Camila", horarios: HORARIOS, activo: true },
];

const SERVICIOS = [
  { id: "serv-1", nombre: "Corte", duracionMin: 30, precioBase: 1000000,
    precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 },
  { id: "serv-2", nombre: "Color", duracionMin: 60, precioBase: 2000000,
    precioPromocional: null, senaRequerida: false, senaPorcentaje: 0 },
];

const ASOCIACIONES = [
  { staffId: "staff-1", servicioId: "serv-1" },
  { staffId: "staff-2", servicioId: "serv-2" },
];

const CLIENTES = [
  { id: "cli-1", nombre: "Juan Pérez", whatsapp: "+549110000001", email: "juan@ejemplo.com" },
  { id: "cli-2", nombre: "María Gómez", whatsapp: "+549110000002", email: null },
];

function propsBase(overrides: Record<string, unknown> = {})
{
  return {
    action: vi.fn(async () => null),
    staff: STAFF,
    servicios: SERVICIOS,
    asociaciones: ASOCIACIONES,
    turnos: [],
    bloqueos: [],
    horariosNegocio: HORARIOS,
    clientes: CLIENTES,
    clienteInicial: null,
    fechaInicial: null,
    ...overrides,
  };
}

/** Recorre los pasos 1-3 hasta abrir el paso de datos. */
async function elegirTurno(user: ReturnType<typeof userEvent.setup>): Promise<void>
{
  await user.click(screen.getByRole("button", { name: "Diego" }));
  await user.click(screen.getByRole("button", { name: /Corte/ }));
  await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);
  await user.click(screen.getAllByRole("button", { name: /^\d{2}:\d{2}$/ })[0]!);
}

describe("FormularioTurnoManual",
() =>
{
  it("debería mostrar los datos recién después de elegir un horario",
  async () =>
  {
    const user = userEvent.setup();

    render(<FormularioTurnoManual {...propsBase()} />);

    expect(screen.queryByRole("heading", { name: "4. Datos del cliente" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.queryByRole("heading", { name: "4. Datos del cliente" })).toBeNull();

    await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);

    expect(screen.queryByRole("heading", { name: "4. Datos del cliente" })).toBeNull();

    await user.click(screen.getAllByRole("button", { name: /^\d{2}:\d{2}$/ })[0]!);

    expect(screen.getByRole("heading", { name: "4. Datos del cliente" })).toBeDefined();
  });

  it("debería precargar los datos del cliente inicial",
  async () =>
  {
    const user = userEvent.setup();

    render(<FormularioTurnoManual {...propsBase({ clienteInicial: CLIENTES[0] })} />);

    expect(screen.getByText(/Cliente precargado/)).toBeDefined();
    expect(screen.getByText("Juan Pérez")).toBeDefined();

    await elegirTurno(user);

    expect((screen.getByLabelText("Cliente") as HTMLSelectElement).value).toBe("cli-1");
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Juan Pérez");
    expect((screen.getByLabelText("WhatsApp") as HTMLInputElement).value).toBe("+549110000001");
    expect((screen.getByLabelText("Email (opcional)") as HTMLInputElement).value)
      .toBe("juan@ejemplo.com");
  });

  it("debería autocompletar al elegir un cliente guardado",
  async () =>
  {
    const user = userEvent.setup();

    render(<FormularioTurnoManual {...propsBase()} />);
    await elegirTurno(user);

    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "cli-2" } });

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("María Gómez");
    expect((screen.getByLabelText("WhatsApp") as HTMLInputElement).value).toBe("+549110000002");
    expect((screen.getByLabelText("Email (opcional)") as HTMLInputElement).value).toBe("");
  });

  it("debería limpiar los datos al elegir un cliente nuevo",
  async () =>
  {
    const user = userEvent.setup();

    render(<FormularioTurnoManual {...propsBase({ clienteInicial: CLIENTES[0] })} />);
    await elegirTurno(user);

    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "" } });

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("WhatsApp") as HTMLInputElement).value).toBe("");
  });

  it("debería mostrar el WhatsApp canónico mientras se escribe",
  async () =>
  {
    const user = userEvent.setup();

    render(<FormularioTurnoManual {...propsBase()} />);
    await elegirTurno(user);

    fireEvent.change(screen.getByLabelText("WhatsApp"), {
      target: { value: "+54 9 11 15 64534124" },
    });

    expect(screen.getByText("+5491164534124")).toBeDefined();
    expect(screen.getByText(/Se guardará como/)).toBeDefined();
  });

  it("debería filtrar los servicios por profesional",
  async () =>
  {
    const user = userEvent.setup();

    render(<FormularioTurnoManual {...propsBase()} />);

    await user.click(screen.getByRole("button", { name: "Diego" }));

    expect(screen.getByRole("button", { name: /Corte/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Color/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Camila" }));

    expect(screen.getByRole("button", { name: /Color/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Corte/ })).toBeNull();
  });

  it("debería enviar los datos del turno a la acción",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async (...args: [string | null, FormData]) =>
    {
      void args;

      return null;
    });

    render(<FormularioTurnoManual {...propsBase({ action })} />);
    await elegirTurno(user);
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());

    const formData = action.mock.calls[0]?.[1] as FormData;

    expect(formData.get("staffId")).toBe("staff-1");
    expect(formData.get("servicioId")).toBe("serv-1");
    expect(formData.get("estado")).toBe("confirmado");
    expect(formData.get("clienteId")).toBe("");
    expect(typeof formData.get("inicio")).toBe("string");
    expect(String(formData.get("inicio"))).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("debería mostrar el error de la acción",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async () => "Ese horario ya está ocupado.");

    render(<FormularioTurnoManual {...propsBase({ action })} />);
    await elegirTurno(user);
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    expect(await screen.findByRole("alert")).toHaveTextContent("ocupado");
  });

  it("debería preseleccionar el día indicado por la agenda",
  async () =>
  {
    const user = userEvent.setup();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const clave = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-` +
      `${String(manana.getDate()).padStart(2, "0")}`;

    render(<FormularioTurnoManual {...propsBase({ fechaInicial: clave })} />);

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.getByText(/Elegí la hora del/)).toBeDefined();
  });
});
