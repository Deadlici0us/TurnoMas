import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import DemoEditableBanner from "./demo-editable-banner";

vi.mock("@/app/dashboard/demo/actions", () =>
{
  return { resetDemoData: vi.fn(async () => undefined) };
});

describe("DemoEditableBanner",
() =>
{
  it("debería explicar el modo demo editable",
  () =>
  {
    render(<DemoEditableBanner />);

    expect(screen.getByText("Estás en la cuenta demo: podés crear, editar y eliminar datos."))
      .toBeDefined();
  });

  it("debería ofrecer restablecer y crear cuenta",
  () =>
  {
    render(<DemoEditableBanner />);

    expect(screen.getByRole("button", { name: "Restablecer datos demo" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Creá tu cuenta gratis" }))
      .toHaveAttribute("href", "/register");
  });
});
