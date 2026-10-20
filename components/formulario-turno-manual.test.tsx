import { fireEvent, render, screen } from "@testing-library/react";
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

const STAFF = [
  { id: "staff-1", nombre: "Diego" },
  { id: "staff-2", nombre: "Camila" },
];

const SERVICIOS = [
  { id: "serv-1", nombre: "Corte", duracion_min: 30, precio_base: 1000000, precio_promocional: null },
  { id: "serv-2", nombre: "Color", duracion_min: 60, precio_base: 2000000, precio_promocional: null },
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
    clientes: CLIENTES,
    clienteInicial: null,
    fechaInicial: "2026-10-06",
    ...overrides,
  };
}

describe("FormularioTurnoManual",
() =>
{
  it("debería precargar los datos del cliente inicial",
  () =>
  {
    render(<FormularioTurnoManual {...propsBase({ clienteInicial: CLIENTES[0] })} />);

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Juan Pérez");
    expect((screen.getByLabelText("WhatsApp") as HTMLInputElement).value).toBe("+549110000001");
    expect((screen.getByLabelText("Email (opcional)") as HTMLInputElement).value).toBe("juan@ejemplo.com");
  });

  it("debería autocompletar al elegir un cliente guardado",
  () =>
  {
    render(<FormularioTurnoManual {...propsBase()} />);

    fireEvent.change(screen.getByLabelText("Cliente guardado (opcional)"), { target: { value: "cli-1" } });

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Juan Pérez");
    expect((screen.getByLabelText("WhatsApp") as HTMLInputElement).value).toBe("+549110000001");
  });

  it("debería mostrar el WhatsApp canónico mientras se escribe",
  () =>
  {
    render(<FormularioTurnoManual {...propsBase()} />);

    fireEvent.change(screen.getByLabelText("WhatsApp"), {
      target: { value: "+54 9 11 15 64534124" },
    });

    expect(screen.getByText("+5491164534124")).toBeDefined();
    expect(screen.getByText(/Se guardará como/)).toBeDefined();
  });

  it("debería filtrar los servicios por profesional",
  () =>
  {
    render(<FormularioTurnoManual {...propsBase()} />);

    expect(screen.getByRole("option", { name: /Corte/ })).toBeDefined();
    expect(screen.queryByRole("option", { name: /Color/ })).toBeNull();

    fireEvent.change(screen.getByLabelText("Profesional"), { target: { value: "staff-2" } });

    expect(screen.getByRole("option", { name: /Color/ })).toBeDefined();
    expect(screen.queryByRole("option", { name: /Corte/ })).toBeNull();
  });

  it("debería enviar los datos del turno a la acción",
  async () =>
  {
    const action = vi.fn(async (...args: [string | null, FormData]) =>
    {
      void args;

      return null;
    });

    render(<FormularioTurnoManual {...propsBase({ action })} />);
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "15:30" } });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());

    const formData = action.mock.calls[0]?.[1] as FormData;

    expect(formData.get("staffId")).toBe("staff-1");
    expect(formData.get("servicioId")).toBe("serv-1");
    expect(formData.get("fecha")).toBe("2026-10-06");
    expect(formData.get("hora")).toBe("15:30");
    expect(formData.get("estado")).toBe("confirmado");
  });

  it("debería mostrar el error de la acción",  async () =>
  {
    const action = vi.fn(async () => "Ese horario ya está ocupado.");

    render(<FormularioTurnoManual {...propsBase({ action })} />);
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    expect(await screen.findByRole("alert")).toHaveTextContent("ocupado");
  });
});
