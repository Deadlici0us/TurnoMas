import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import DemoReadonlyBanner from "@/components/demo-readonly-banner";

describe("DemoReadonlyBanner",
() =>
{
  it("debería avisar solo lectura con link a registro",
  () =>
  {
    render(<DemoReadonlyBanner accionBloqueada={false} />);

    expect(screen.getByText(/cuenta demo: es de solo lectura/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Creá tu cuenta gratis" }))
      .toHaveProperty("href", "http://localhost:3000/register");
  });

  it("debería mostrar alerta cuando se bloqueó una acción",
  () =>
  {
    render(<DemoReadonlyBanner accionBloqueada={true} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/No pudimos guardar ese cambio en la demo/)).toBeDefined();
  });

  it("no debería mostrar alerta en vista normal",
  () =>
  {
    render(<DemoReadonlyBanner accionBloqueada={false} />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
