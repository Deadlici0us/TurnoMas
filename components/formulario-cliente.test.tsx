import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FormularioCliente from "./formulario-cliente";

const { mockRefresh } = vi.hoisted(() =>
{
  return { mockRefresh: vi.fn() };
});

vi.mock("next/navigation", () =>
{
  return { useRouter: () => ({ refresh: mockRefresh }) };
});

function escribir(label: string, valor: string): void
{
  fireEvent.change(screen.getByLabelText(label), { target: { value: valor } });
}

async function enviar(): Promise<void>
{
  const form = document.querySelector("form");

  if (form === null)
  {
    throw new Error("Falta el formulario de cliente.");
  }

  await act(async () =>
  {
    fireEvent.submit(form);
  });
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("FormularioCliente",
() =>
{
  it("debería mostrar el WhatsApp canónico antes de guardar",
  () =>
  {
    render(
      <FormularioCliente
        action={vi.fn(async () => undefined)}
        titulo="Nuevo cliente"
        cta="Agregar cliente"
        successMessage="Cliente agregado."
      />,
    );

    escribir("WhatsApp", "+54 9 11 15 64534124");

    expect(screen.getByText("+5491164534124")).toBeDefined();
    expect(screen.getByText(/Se guardará como/)).toBeDefined();
  });

  it("debería bloquear el submit con WhatsApp inválido",
  async () =>
  {
    const action = vi.fn(async () => undefined);

    render(
      <FormularioCliente
        action={action}
        titulo="Nuevo cliente"
        cta="Agregar cliente"
        successMessage="Cliente agregado."
      />,
    );

    escribir("Nombre", "Juan Pérez");
    escribir("WhatsApp", "abc");
    await enviar();

    expect(await screen.findByText(/solo puede tener números/)).toBeDefined();
    expect(action).not.toHaveBeenCalled();
  });

  it("debería bloquear el submit con email inválido",
  async () =>
  {
    const action = vi.fn(async () => undefined);

    render(
      <FormularioCliente
        action={action}
        titulo="Nuevo cliente"
        cta="Agregar cliente"
        successMessage="Cliente agregado."
      />,
    );

    escribir("Nombre", "Juan Pérez");
    escribir("WhatsApp", "1164534124");
    escribir("Email (opcional)", "juan@ejemplo.com}");
    await enviar();

    expect(await screen.findByText(/caracteres inválidos/)).toBeDefined();
    expect(action).not.toHaveBeenCalled();
  });

  it("debería enviar valores normalizados y refrescar la página",
  async () =>
  {
    const action = vi.fn<(datos: FormData) => Promise<void>>(async () => undefined);

    render(
      <FormularioCliente
        action={action}
        titulo="Nuevo cliente"
        cta="Agregar cliente"
        successMessage="Cliente agregado."
      />,
    );

    escribir("Nombre", "  Juan Pérez  ");
    escribir("WhatsApp", "+54 11 15 6453-4124");
    escribir("Email (opcional)", "  Juan@Ejemplo.COM ");
    await enviar();

    expect(action).toHaveBeenCalledOnce();
    const datos = action.mock.calls[0]?.[0] as unknown as FormData;

    expect(datos.get("nombre")).toBe("Juan Pérez");
    expect(datos.get("whatsapp")).toBe("+5491164534124");
    expect(datos.get("email")).toBe("juan@ejemplo.com");
    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it("debería precargar los datos al editar", () =>
  {
    render(
      <FormularioCliente
        action={vi.fn(async () => undefined)}
        titulo="Editar datos del cliente"
        cta="Guardar cambios"
        successMessage="Cliente actualizado."
        cliente={{
          nombre: "Juan Pérez",
          whatsapp: "+5491164534124",
          email: "juan@ejemplo.com",
        }}
      />,
    );

    expect(screen.getByLabelText("Nombre")).toHaveValue("Juan Pérez");
    expect(screen.getByLabelText("WhatsApp")).toHaveValue("+5491164534124");
    expect(screen.getByLabelText("Email (opcional)")).toHaveValue("juan@ejemplo.com");
  });

  it("debería mostrar el error del servidor sin romper la página", async () =>
  {
    const action = vi.fn(async () =>
    {
      throw new Error("Ese WhatsApp ya pertenece a otro cliente.");
    });

    render(
      <FormularioCliente
        action={action}
        titulo="Nuevo cliente"
        cta="Agregar cliente"
        successMessage="Cliente agregado."
      />,
    );

    escribir("Nombre", "Juan Pérez");
    escribir("WhatsApp", "1164534124");
    await enviar();

    expect(await screen.findByText("Ese WhatsApp ya pertenece a otro cliente.")).toBeDefined();
  });
});
