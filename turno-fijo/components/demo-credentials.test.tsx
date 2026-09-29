import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DemoCredentials from "@/components/demo-credentials";

describe("DemoCredentials",
() =>
{
  it("debería mostrar email y contraseña demo con botones para copiar",
  () =>
  {
    render(
      <DemoCredentials
        email="demo@turnofijo.com"
        password="demo123"
        emailLabel="Usuario"
        passwordLabel="Contraseña"
        copyLabel="Copiar"
        copiedLabel="¡Copiado!"
      />,
    );

    expect(screen.getByText("demo@turnofijo.com")).toBeDefined();
    expect(screen.getByText("demo123")).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Copiar" })).toHaveLength(2);
  });

  it("debería confirmar el copiado al hacer click en copiar",
  async () =>
  {
    const user = userEvent.setup();

    render(
      <DemoCredentials
        email="demo@turnofijo.com"
        password="demo123"
        emailLabel="Usuario"
        passwordLabel="Contraseña"
        copyLabel="Copiar"
        copiedLabel="¡Copiado!"
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Copiar" })[0]);

    expect(await screen.findByText("¡Copiado!")).toBeDefined();
  });
});
