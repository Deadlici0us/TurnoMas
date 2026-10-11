import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import FormularioServicio from "./formulario-servicio";

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

function enviarFormulario(): void
{
  const form = document.querySelector("form");

  if (form === null)
  {
    throw new Error("Falta el formulario de servicio.");
  }

  fireEvent.submit(form);
}

describe("FormularioServicio",
() =>
{
  it("debería mostrar el error de la acción sin romper la página",
  async () =>
  {
    const action = vi.fn(async () => "Conectá tu MercadoPago antes de activar señas.");

    render(<FormularioServicio action={action} titulo="Nuevo servicio" cta="Agregar servicio" />);

    enviarFormulario();

    expect(await screen.findByRole("alert")).toHaveTextContent("Conectá tu MercadoPago");
    expect(action).toHaveBeenCalledOnce();
  });

  it("debería no mostrar alerta cuando la acción sale bien",
  async () =>
  {
    const action = vi.fn(async () => null);

    render(<FormularioServicio action={action} titulo="Nuevo servicio" cta="Agregar servicio" />);

    enviarFormulario();

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
