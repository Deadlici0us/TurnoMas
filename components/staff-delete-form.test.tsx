import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ActionResult } from "@/lib/actions/action-result";
import StaffDeleteForm from "./staff-delete-form";
import ToastProvider from "./ui/toast-provider";
import { resetToasts } from "./ui/toast-store";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () =>
{
  return { useRouter: () => ({ refresh }) };
});

function renderForm(action: () => Promise<ActionResult<unknown> | void>)
{
  return render(
    <ToastProvider>
      <StaffDeleteForm action={action} nombre="Gisela" />
    </ToastProvider>,
  );
}

describe("StaffDeleteForm",
() =>
{
  afterEach(() =>
  {
    refresh.mockClear();
    resetToasts();
  });

  it("debería llamar a la acción cuando se confirma",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<ActionResult<unknown>> => ({ ok: true, data: undefined }));
    window.confirm = vi.fn(() => true);

    renderForm(action);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "¿Eliminar a Gisela? Esta acción no se puede deshacer.");
    expect(action).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("debería frenar el envío cuando se cancela",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<ActionResult<unknown>> => ({ ok: true, data: undefined }));
    window.confirm = vi.fn(() => false);

    renderForm(action);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(action).not.toHaveBeenCalled();
  });

  it("debería mostrar el error y refrescar si el profesional ya tiene turnos",
  async () =>
  {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<ActionResult<unknown>> => ({
      ok: false,
      code: "staff_con_historial",
      error: "Tiene turnos en el historial. Desactivalo.",
    }));
    window.confirm = vi.fn(() => true);

    renderForm(action);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
    {
      expect(screen.getByText("Tiene turnos en el historial. Desactivalo.")).toBeDefined();
    });
    expect(refresh).toHaveBeenCalledOnce();
  });
});
