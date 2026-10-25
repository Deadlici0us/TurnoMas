import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import TerminosPage from "./page";

describe("TerminosPage",
() =>
{
  it("debería mostrar el plan y la seña",
  () =>
  {
    render(<TerminosPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Términos de servicio" })).toBeDefined();
    expect(screen.getByText(/14.999 ARS/)).toBeDefined();
    expect(screen.getByText(/MercadoPago procesa los pagos/)).toBeDefined();
  });

  it("debería enlazar al contacto y al inicio",
  () =>
  {
    render(<TerminosPage />);

    expect(screen.getByRole("link", { name: "soporte@turnomas.com" }))
      .toHaveAttribute("href", "mailto:soporte@turnomas.com");
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });
});
