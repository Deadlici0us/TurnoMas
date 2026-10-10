import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ZonaPeligroEliminar from "./zona-peligro-eliminar";

const { mockSolicitar, mockConfirmar, mockPush } = vi.hoisted(() =>
{
  return { mockSolicitar: vi.fn(), mockConfirmar: vi.fn(), mockPush: vi.fn() };
});

vi.mock("next/navigation", () =>
{
  return { useRouter: () => ({ push: mockPush }) };
});

vi.mock("@/app/dashboard/config/actions", () =>
{
  return {
    solicitarEliminacionNegocio: mockSolicitar,
    confirmarEliminacionNegocio: mockConfirmar,
  };
});

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("ZonaPeligroEliminar",
() =>
{
  it("debería pedir el código al iniciar",
  async () =>
  {
    const user = userEvent.setup();
    mockSolicitar.mockResolvedValueOnce({ token: "tok-1", emailEnmascarado: "d***@x.com" });

    render(<ZonaPeligroEliminar />);
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }));

    expect(mockSolicitar).toHaveBeenCalledOnce();
    expect(await screen.findByPlaceholderText("Código del email")).toBeDefined();
    expect(screen.getByText(/d\*\*\*@x.com/)).toBeDefined();
  });

  it("debería mostrar error cuando el envío falla",
  async () =>
  {
    const user = userEvent.setup();
    mockSolicitar.mockRejectedValueOnce(new Error("Sin sesión."));

    render(<ZonaPeligroEliminar />);
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sin sesión.");
    expect(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" })).toBeDefined();
  });

  it("debería habilitar eliminar solo con código y texto",
  async () =>
  {
    const user = userEvent.setup();
    mockSolicitar.mockResolvedValueOnce({ token: "tok-1", emailEnmascarado: "d***@x.com" });

    render(<ZonaPeligroEliminar />);
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }));
    await screen.findByPlaceholderText("Código del email");

    const eliminar = screen.getByRole("button", { name: "Eliminar definitivamente" });

    expect(eliminar).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Código del email"), "12ab34cdef");
    await user.type(screen.getByPlaceholderText("ELIMINAR"), "ELIMINAR");

    expect(screen.getByPlaceholderText("Código del email")).toHaveValue("1234");
    expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Código del email"), "56");

    expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).not.toBeDisabled();
  });

  it("debería confirmar y redirigir al inicio",
  async () =>
  {
    const user = userEvent.setup();
    mockSolicitar.mockResolvedValueOnce({ token: "tok-1", emailEnmascarado: "d***@x.com" });
    mockConfirmar.mockResolvedValueOnce(undefined);

    render(<ZonaPeligroEliminar />);
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }));
    await screen.findByPlaceholderText("Código del email");
    await user.type(screen.getByPlaceholderText("Código del email"), "123456");
    await user.type(screen.getByPlaceholderText("ELIMINAR"), "ELIMINAR");
    await user.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));

    expect(mockConfirmar).toHaveBeenCalledWith("tok-1", "123456", "ELIMINAR");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("debería mostrar error cuando la confirmación falla",
  async () =>
  {
    const user = userEvent.setup();
    mockSolicitar.mockResolvedValueOnce({ token: "tok-1", emailEnmascarado: "d***@x.com" });
    mockConfirmar.mockRejectedValueOnce(new Error("El código no coincide."));

    render(<ZonaPeligroEliminar />);
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }));
    await screen.findByPlaceholderText("Código del email");
    await user.type(screen.getByPlaceholderText("Código del email"), "123456");
    await user.type(screen.getByPlaceholderText("ELIMINAR"), "ELIMINAR");
    await user.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El código no coincide.");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("debería reenviar el código",
  async () =>
  {
    const user = userEvent.setup();
    mockSolicitar.mockResolvedValue({ token: "tok-1", emailEnmascarado: "d***@x.com" });

    render(<ZonaPeligroEliminar />);
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }));
    await screen.findByPlaceholderText("Código del email");
    await user.click(screen.getByRole("button", { name: "Reenviar código" }));

    expect(mockSolicitar).toHaveBeenCalledTimes(2);
  });
});
