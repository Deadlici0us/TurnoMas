import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import PrivacidadPage from "./page";

describe("PrivacidadPage",
() =>
{
  it("debería mostrar el responsable y el contacto",
  () =>
  {
    render(<PrivacidadPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeDefined();
    expect(screen.getByText(/TurnoMas es el responsable del tratamiento/)).toBeDefined();
    expect(screen.getByRole("link", { name: "soporte@turnomas.com" }))
      .toHaveAttribute("href", "mailto:soporte@turnomas.com");
  });

  it("debería explicar el login con Supabase y volver al inicio",
  () =>
  {
    render(<PrivacidadPage />);

    expect(screen.getByText(/selector de cuentas de Google/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });
});
