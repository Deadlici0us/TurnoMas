import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import PortalMapa from "./portal-mapa";

describe("PortalMapa",
() =>
{
  it("debería mostrar un iframe centrado en las coordenadas",
  () =>
  {
    render(<PortalMapa lat={-34.6037} lng={-58.3816} nombre="Barbería Diego" />);

    const iframe = screen.getByTitle("Ubicación de Barbería Diego");

    expect(iframe.getAttribute("src")).toContain("https://www.google.com/maps");
    expect(iframe.getAttribute("src")).toContain("q=-34.6037%2C-58.3816");
    expect(iframe.getAttribute("src")).toContain("output=embed");
    expect(iframe.getAttribute("loading")).toBe("lazy");
  });

  it("debería enlazar a Google Maps cuando hay href",
  () =>
  {
    render(
      <PortalMapa
        lat={-34.6037}
        lng={-58.3816}
        nombre="Barbería Diego"
        href="https://www.google.com/maps/@-34.6037,-58.3816,17z"
      />,
    );

    const enlace = screen.getByRole("link", { name: /ver en google maps/i });

    expect(enlace.getAttribute("href")).toContain("google.com/maps");
    expect(enlace.getAttribute("rel")).toContain("noopener");
  });

  it("no debería renderizar con coordenadas inválidas",
  () =>
  {
    const { container } = render(<PortalMapa lat={Number.NaN} lng={-58.3816} nombre="X" />);

    expect(container.querySelector("iframe")).toBeNull();
  });
});
