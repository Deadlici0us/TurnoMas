import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ActionForm from "./action-form";
import { resetToasts } from "./toast-store";
import SubmitButton from "./submit-button";
import ToastProvider from "./toast-provider";

function renderForm(action: (formData: FormData) => Promise<void>)
{
  return render(
    <ToastProvider>
      <ActionForm action={action} successMessage="Cambios guardados" errorMessage="No pudimos guardar">
        <input name="nombre" defaultValue="Diego" />
        <SubmitButton pendingLabel="Guardando...">Guardar</SubmitButton>
      </ActionForm>
    </ToastProvider>,
  );
}

describe("ActionForm",
() =>
{
  afterEach(() =>
  {
    act(() =>
    {
      resetToasts();
    });
  });

  it("debería mostrar el estado pendiente y el toast de éxito",
  async () =>
  {
    const user = userEvent.setup();
    let resolver!: () => void;
    const action = vi.fn(() => new Promise<void>((resolve) =>
    {
      resolver = resolve;
    }));

    renderForm(action);
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("button", { name: /Guardando/ })).toBeDisabled();

    resolver();

    await waitFor(() =>
    {
      expect(screen.getByText("Cambios guardados")).toBeDefined();
    });
  });

  it("debería mostrar un toast de error si la acción falla",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async () =>
    {
      throw new Error("El servicio ya existe");
    });

    renderForm(action);
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
    {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("El servicio ya existe")).toBeDefined();
    });
  });
});
