import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import PerfilStaffForm from "./perfil-staff-form";

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

const SERVICIOS = [
  { id: "sv1", nombre: "Corte" },
  { id: "sv2", nombre: "Barba" },
];

function enviarFormulario(): void
{
  const form = document.querySelector("form");

  if (form === null)
  {
    throw new Error("Falta el formulario de perfil.");
  }

  fireEvent.submit(form);
}

describe("PerfilStaffForm",
() =>
{
  it("debería precargar descripción y servicios elegidos",
  () =>
  {
    render(
      <PerfilStaffForm
        action={vi.fn(async () => null)}
        descripcion="Especialista en color"
        servicios={SERVICIOS}
        seleccionados={["sv2"]}
      />,
    );

    expect(screen.getByLabelText(/Descripción breve/)).toHaveValue("Especialista en color");
    expect(screen.getByRole("checkbox", { name: "Barba" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Corte" })).not.toBeChecked();
  });

  it("debería enviar la descripción y los servicios seleccionados",
  async () =>
  {
    const capturado: { formData: FormData | null } = { formData: null };
    const action = vi.fn(async (_prev: string | null, formData: FormData) =>
    {
      capturado.formData = formData;

      return null;
    });

    render(
      <PerfilStaffForm
        action={action}
        descripcion={null}
        servicios={SERVICIOS}
        seleccionados={[]}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Corte" }));
    enviarFormulario();

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());

    expect(capturado.formData?.getAll("servicios")).toEqual(["sv1"]);
  });

  it("debería mostrar el error de la acción sin romper la página",
  async () =>
  {
    const action = vi.fn(async () => "No pudimos guardar el perfil. Probá de nuevo.");

    render(
      <PerfilStaffForm action={action} descripcion={null} servicios={SERVICIOS} seleccionados={[]} />,
    );

    enviarFormulario();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar el perfil");
  });

  it("debería avisar cuando el negocio no tiene servicios",
  () =>
  {
    render(
      <PerfilStaffForm action={vi.fn(async () => null)} descripcion={null} servicios={[]} seleccionados={[]} />,
    );

    expect(screen.getByText(/Todavía no cargaste servicios/)).toBeDefined();
  });
});
